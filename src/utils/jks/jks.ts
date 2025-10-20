import { Buffer } from 'buffer';
// const jksJs = require('jks-js');
const pkijs = require('pkijs');
const ans1js = require('asn1js');
const asn1 = require('asn1.js');
import OutputStream from '@/utils/jks/Jks/Stream/OutputStream';
import InputStream from '@/utils/jks/Jks/Stream/InputStream';
import PasswordDigest from '@/utils/jks/Jks/Encryption/PasswordDigist';

// import ASN1 from '@lapo/asn1js';
const { ASN1 } = require('@lapo/asn1js');
import rsaPKCS from './Jks/PKCS/rsaPKCS';
import ecPKCS from './Jks/PKCS/ecPKCS';

export interface PEM { cert: string; key: string; };

export type JKS_MAGIC = 0xfeedfeed;
export type JKS_VERSION_1 = 0x01;
export type JKS_VERSION_2 = 0x02;
export type JKS_PRIVATE_KEY_TAG = 1;
export type JKS_TRUSTED_CERT_TAG = 2;

export const JKS_MAGIC = 0xfeedfeed;
export const JKS_VERSION_1 = 0x01;
export const JKS_VERSION_2 = 0x02;
export const JKS_PRIVATE_KEY_TAG = 1;
export const JKS_TRUSTED_CERT_TAG = 2;

export default class Jks {
  public cert!: string;
  public key!: string;
  public password!: string;
  public jks!: ArrayBuffer;
  private stream: OutputStream;

  constructor() {
    this.stream = new OutputStream();
  }

  /**
   * 解密私钥数据（逆向encryptPlainKey逻辑）
   */
  private async decryptPrivateKey(encryptedData: Buffer, password: string): Promise<Buffer> {
    try {
      // 解析ASN.1结构获取加密的私钥数据
      const EncryptedPrivateKeyInfo = asn1.define('EncryptedPrivateKeyInfo', function(this: any) {
      this.seq().obj(
        this.key('encryptionAlgorithm').seq().obj(
          this.key('algorithm').objid(),
          this.key('parameters').optional().any()
        ),
        this.key('encryptedData').octstr()
      );
    });
      
      const parsed = EncryptedPrivateKeyInfo.decode(encryptedData, 'der');
      const protectedKey = parsed.encryptedData;
      
      // 逆向encryptPlainKey的过程
      // 使用与PasswordDigest相同的UTF-16BE编码方式
      const passwdBytes = Buffer.alloc(password.length * 2);
      for (let i = 0, j = 0; i < password.length; i++) {
        passwdBytes[j++] = password[i].charCodeAt(0) >> 8;
        passwdBytes[j++] = password[i].charCodeAt(0);
      }
      
      // 提取盐值（前20字节）
      const salt = protectedKey.slice(0, 20);
      
      // 提取加密的密钥数据（除了盐值和最后20字节的完整性摘要）
      const encrKey = protectedKey.slice(20, protectedKey.length - 20);
      
      // 提取完整性摘要（最后20字节）
      const storedIntegrityDigest = protectedKey.slice(protectedKey.length - 20);
      
      // 重建XOR密钥
      const numRounds = Math.ceil(encrKey.length / 20);
      let xorKey = Buffer.alloc(0);
      let digest = salt;
      
      for (let i = 0; i < numRounds; i++) {
        const xorOffset = i * 20;
        
        // 计算摘要
        digest = Buffer.from(await crypto.subtle.digest("SHA-1", Buffer.concat([passwdBytes, digest])));
        
        // 复制摘要到xorKey
        if (i < numRounds - 1) {
          xorKey = Buffer.concat([xorKey.slice(0, xorOffset), digest]);
        } else {
          xorKey = Buffer.concat([
            xorKey.slice(0, xorOffset),
            digest.slice(0, encrKey.length - xorOffset)
          ]);
        }
      }
      
      // XOR解密得到原始密钥
      const plainKeyBuffer = Buffer.alloc(encrKey.length);
      for (let i = 0; i < plainKeyBuffer.length; i++) {
        plainKeyBuffer[i] = encrKey[i] ^ xorKey[i];
      }
      
      // 验证完整性摘要
      const computedIntegrityDigest = Buffer.from(await crypto.subtle.digest("SHA-1", Buffer.concat([passwdBytes, plainKeyBuffer])));
      
      if (!storedIntegrityDigest.equals(computedIntegrityDigest)) {
        throw new Error('Private key integrity check failed - wrong password or corrupted data');
      }
      
      return plainKeyBuffer;
    } catch (error) {
      throw new Error(`Failed to decrypt private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 将私钥数据转换为PEM格式
   */
  private convertToPEMPrivateKey(keyData: Buffer): string {
    try {
      // 解析私钥的ASN.1结构
      const PrivateKeyInfo = asn1.define('PrivateKeyInfo', function(this: any) {
        this.seq().obj(
          this.key('version').int(),
          this.key('privateKeyAlgorithm').seq().obj(
            this.key('algorithm').objid(),
            this.key('parameters').optional().any()
          ),
          this.key('privateKey').octstr()
        );
      });
      
      let pemKey: string;
      
      try {
        // 尝试解析为PKCS#8格式
        const parsed = PrivateKeyInfo.decode(keyData, 'der');
        const base64Key = keyData.toString('base64');
        pemKey = `-----BEGIN PRIVATE KEY-----\n${base64Key.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`;
      } catch {
        // 如果不是PKCS#8格式，尝试作为原始私钥处理
        const base64Key = keyData.toString('base64');
        
        // 检查是否为RSA私钥
        try {
          const RSAPrivateKey = asn1.define('RSAPrivateKey', function(this: any) {
          this.seq().obj(
            this.key('version').int(),
            this.key('modulus').int(),
            this.key('publicExponent').int(),
            this.key('privateExponent').int(),
            this.key('prime1').int(),
            this.key('prime2').int(),
            this.key('exponent1').int(),
            this.key('exponent2').int(),
            this.key('coefficient').int()
          );
        });
          
          RSAPrivateKey.decode(keyData, 'der');
          pemKey = `-----BEGIN RSA PRIVATE KEY-----\n${base64Key.match(/.{1,64}/g)?.join('\n')}\n-----END RSA PRIVATE KEY-----`;
        } catch {
          // 尝试作为EC私钥
          pemKey = `-----BEGIN EC PRIVATE KEY-----\n${base64Key.match(/.{1,64}/g)?.join('\n')}\n-----END EC PRIVATE KEY-----`;
        }
      }
      
      return pemKey;
    } catch (error) {
      throw new Error(`Failed to convert private key to PEM: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 将证书数据转换为PEM格式（拼接证书链）
   */
  private convertToPEMCertificates(certificates: Buffer[]): string {
    try {
      const pemCertificates: string[] = [];
      
      for (const certData of certificates) {
        const base64Cert = certData.toString('base64');
        const pemCert = `-----BEGIN CERTIFICATE-----\n${base64Cert.match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`;
        pemCertificates.push(pemCert);
      }
      
      // 拼接所有证书（证书链）
      return pemCertificates.join('\n');
    } catch (error) {
      throw new Error(`Failed to convert certificates to PEM: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 从PEM初始化实例
   *
   * @param cert 证书PEM
   * @param key 私钥PEM
   * @param password 私钥密码，可不传
   * @returns {Jks}
   */
  static fromPEM(cert: string, key: string, password: string | null = null) {
    const jks = new Jks();
    jks.cert = cert;
    jks.key = key;
    if (password) {
      jks.password = password;
    }
    jks.prepareKey();

    return jks;
  }


  /**
   * 从JKS初始化实例
   *
   * @param jks JavaKeyStore Buffer
   * @param password 私钥密码，可不传
   * @returns {Jks}
   */
  static fromJKS(jksContent: ArrayBuffer, password: string) {
    const jks = new Jks();
    jks.jks = jksContent;
    jks.password = password;

    return jks;
  }

  /**
   * 从jks转换为pem
   *
   * @returns {PEM}
   */
  public getPEM(): Promise<PEM> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.jks) {
          return reject(new Error('JKS content is required'));
        }
        if (!this.password) {
          return reject(new Error('password is required'));
        }

        if (!this.cert || !this.key) {
          // 解析JKS文件
          const inputStream = new InputStream(Buffer.from(this.jks));
          
          // 验证JKS magic number
          const magic = inputStream.readInt();
          if (magic !== JKS_MAGIC) {
            return reject(new Error('Invalid JKS file: wrong magic number'));
          }

          // 读取版本
          const version = inputStream.readInt();
          if (version !== JKS_VERSION_1 && version !== JKS_VERSION_2) {
            return reject(new Error('Unsupported JKS version'));
          }

          // 读取条目数量
          const entryCount = inputStream.readInt();
          
          let privateKeyData: Buffer | null = null;
          const certificates: Buffer[] = [];
          
          // 解析每个条目
          for (let i = 0; i < entryCount; i++) {
            const tag = inputStream.readInt();
            const alias = inputStream.readUTF();
            const timestamp = inputStream.readLong();
            
            if (tag === JKS_PRIVATE_KEY_TAG) {
              // 私钥条目
              const encryptedKeyLength = inputStream.readInt();
              const encryptedKeyData = inputStream.read(encryptedKeyLength);
              
              // 解密私钥
              privateKeyData = await this.decryptPrivateKey(encryptedKeyData, this.password);
              
              // 读取证书链
              const certCount = inputStream.readInt();
              for (let j = 0; j < certCount; j++) {
                if (version === JKS_VERSION_2) {
                  // 跳过证书类型
                  const certType = inputStream.readUTF();
                }
                const certLength = inputStream.readInt();
                const certData = inputStream.read(certLength);
                certificates.push(certData);
              }
            } else if (tag === JKS_TRUSTED_CERT_TAG) {
              // 可信证书条目
              if (version === JKS_VERSION_2) {
                const certType = inputStream.readUTF();
              }
              const certLength = inputStream.readInt();
              const certData = inputStream.read(certLength);
              certificates.push(certData);
            }
          }
          
          // 验证密码完整性
           const storedDigest = inputStream.read(20);
           
           // 获取除了最后20字节摘要之外的所有JKS数据
           const jksDataWithoutDigest = Buffer.from(this.jks).slice(0, -20);
           const passwordDigest = new PasswordDigest(jksDataWithoutDigest, this.password);
           const computedDigest = Buffer.from(await passwordDigest.digist());
           
           if (!storedDigest.equals(computedDigest)) {
             return reject(new Error('Invalid password or corrupted keystore'));
           }
          
          // 转换为PEM格式
          if (privateKeyData) {
            this.key = this.convertToPEMPrivateKey(privateKeyData);
          }
          
          if (certificates.length > 0) {
            this.cert = this.convertToPEMCertificates(certificates);
          }
        }
        
        const cert = this.cert;
        const key = this.key;
        return resolve({ cert, key });
      } catch (error) {
        return reject(error);
      }
    });
  }

  prepareKey() {
    // detect is private key is rsa or ec by asn1.js
    const seq = ASN1.decode(Buffer.from(this.key.replace(/([\r\n]+|(-----(BEGIN|END) PRIVATE KEY-----)|(-----(BEGIN|END) (RSA|EC) PRIVATE KEY-----))/g, ''), 'base64'));
    if (seq.typeName() != 'SEQUENCE') {
      throw new Error('invalid key');
    }

    // secp384r1 06 05 2B 81 04 00 22
    // secp521r1 06 05 2B 81 04 00 23
    // secp256r1 06 05 2B 81 04 00 0A
    // secp256k1 06 05 2B 81 04 00 0B
    // secp224r1 06 05 2B 81 04 00 21
    // secp192r1 06 05 2B 81 04 00 0C
    // secp224k1 06 05 2B 81 04 00 20
    // secp192k1 06 05 2B 81 04 00 0D
    // ecPublicKey 06 07 2A 86 48 CE 3D 02 01
    // id-ecPublicKey 06 07 2A 86 48 CE 3D 02 01
    // rsaEncryption 06 09 2A 86 48 86 F7 0D 01 01 01
    const matches = {
      ['06 05 2B 81 04 00 22'.replace(/ /g, '')]: 'ec',
      ['06 05 2B 81 04 00 23'.replace(/ /g, '')]: 'ec',
      ['06 05 2B 81 04 00 0A'.replace(/ /g, '')]: 'ec',
      ['06 05 2B 81 04 00 0B'.replace(/ /g, '')]: 'ec',
      ['06 05 2B 81 04 00 21'.replace(/ /g, '')]: 'ec',
      ['06 05 2B 81 04 00 0C'.replace(/ /g, '')]: 'ec',
      ['06 05 2B 81 04 00 20'.replace(/ /g, '')]: 'ec',
      ['06 05 2B 81 04 00 0D'.replace(/ /g, '')]: 'ec',
      ['06 07 2A 86 48 CE 3D 02 01'.replace(/ /g, '')]: 'ec',
      ['06 07 2A 86 48 CE 3D 02 01'.replace(/ /g, '')]: 'ec',
      ['06 09 2A 86 48 86 F7 0D 01 01 01'.replace(/ /g, '')]: 'rsa',
    };

    const hex = seq.toHexString();

    for (const match in matches) {
      if (hex.indexOf(match) !== -1) {
        const buffer = Buffer.from(this.key.replace(/([\r\n]+|(-----(BEGIN|END) PRIVATE KEY-----)|(-----(BEGIN|END) (RSA|EC) PRIVATE KEY-----))/g, ''), 'base64');
        if (matches[match] === 'ec') {
          return this.prepareEcPrivateKey(buffer);
        } else {
          return this.prepareRsaPrivateKey(buffer);
        }
        return;
      }
    }
  }

  prepareRsaPrivateKey(privateKey: Buffer) {
    this.key = <string> rsaPKCS.toPKCS8(this.key);
  }

  prepareEcPrivateKey(privateKey: Buffer) {
    this.key = <string> ecPKCS.toPKCS8(this.key);
  }

  /**
   * @param {Buffer} plainKeyBuffer
   */
  async encryptPlainKey(plainKeyBuffer: Buffer, password: string) {
    let numRounds = 61; // the number of rounds

    const DIGEST_LEN = 20, SALT_LEN = 20;

    // Generate a random salt
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));

    // Initialize XOR key with zeros
    let xorKey = Buffer.alloc(plainKeyBuffer.length);
    // The password used for protecting/recovering keys passed through this
    // key protector.
    const passwdBytes = Buffer.alloc(password.length * 2);

    for (let i = 0, j = 0; i < password.length; i++) {
      passwdBytes[j++] = password[i].charCodeAt(0) >> 8;
      passwdBytes[j++] = password[i].charCodeAt(0);
    }
    // Compute the digests, and store them in "xorKey"
    for (let i = 0, xorOffset = 0, digest = salt; i < numRounds; i++, xorOffset += DIGEST_LEN) {
      digest = Buffer.from(await crypto.subtle.digest("SHA-1", Buffer.concat([passwdBytes, digest,])));

      // Copy the digest into "xorKey"
      if (i < numRounds - 1) {
        xorKey = Buffer.concat([
          xorKey.slice(0, xorOffset),
          digest,
        ]);
      } else {
        xorKey = Buffer.concat([
          xorKey.slice(0, xorOffset),
          digest.slice(0, plainKeyBuffer.length - xorOffset)
        ]);
      }
    }

    // XOR "plainKeyBuffer" with "xorKey", and store the result in "encrKey"
    const encrKey = Buffer.alloc(plainKeyBuffer.length);
    for (let i = 0; i < encrKey.length; i++) {
      encrKey[i] = plainKeyBuffer[i] ^ xorKey[i];
    }

    // Concatenate salt, encrKey, and digest for the final protected key
    let protectedKey = Buffer.concat([salt, encrKey]);

    // Compute the integrity digest and append it to the protected key
    const digest = Buffer.from(await crypto.subtle.digest("SHA-1", Buffer.concat([passwdBytes, plainKeyBuffer,])));
    protectedKey = Buffer.concat([protectedKey, digest,]);

    return protectedKey;
  }

  encryptPrivateKey(privateKey: Buffer, password: string): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const encryptedData = await this.encryptPlainKey(privateKey, password);
      const algorithmIdentifier = 'pbeWithMD5AndDES-CBC';
      const KEY_PROTECTOR_OID = '1.3.6.1.4.1.42.2.17.1.1';

      const encrypt = asn1.define('encrypt', function (this: any) {
        this.seq().obj(
          this.key('encryptionAlgorithm').seq().obj(
            this.key('algorithm').objid({
              [KEY_PROTECTOR_OID]: 'pbeWithMD5AndDES-CBC',
            }),
            this.key('parameters').null_().optional(),
          ),
          this.key('encryptedData').octstr(),
        );
      });


      const output = encrypt.encode({
        encryptionAlgorithm: {
          algorithm: algorithmIdentifier,
          parameters: null,
        },
        encryptedData: encryptedData,
      }, 'der');

      return resolve(output);
    });
  }


  /**
   * 从pem转换为jks
   *
   * @param xVersion JKS版本号，1或2，默认2
   * @param password 私钥密码，不传时从实例获取密码
   * @returns {Promise<Buffer>}
   */
  public getJKS(xVersion: JKS_VERSION_1 | JKS_VERSION_2 = JKS_VERSION_2, password: string | null = null, alias: string | null = null): Promise<ArrayBuffer> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.cert) {
          return reject(new Error('cert is required'));
        }
        if (!this.key) {
          return reject(new Error('key is required'));
        }
        if (!password && !this.password) {
          return reject(new Error('password is required'));
        }
        console.log('this---', this)
        if (!this.jks) {
          if (!password) {
            password = this.password;
          }

          this.stream.writeInt(JKS_MAGIC);

          // parse common name in cert PEM
          const cert = this.cert;
          // first PEM block
          const pemBlock = cert.split('-----END CERTIFICATE-----')[0];
          // PEM remove header and footer and new line
          const pem = pemBlock.replace(/-----BEGIN CERTIFICATE-----/, '').replace(/-----END CERTIFICATE-----/, '').replace(/[\n\r]+/g, '');
          // base64 decode
          const pemBuffer = Buffer.from(pem, 'base64');

          // ans1js parse cert
          const asn1 = ans1js.fromBER(pemBuffer.buffer);
          const parse = new pkijs.Certificate({ schema: asn1.result });
          // get commonName
          const commonNameTypeValue = parse.subject.typesAndValues.find(
            (typeAndValue: any) => {
              return typeAndValue.type === '2.5.4.3'; // commonName OID
            }
          );

          let commonName = 'unknown';
          if (commonNameTypeValue && commonNameTypeValue.value && commonNameTypeValue.value.blockLength) {
            commonName = commonNameTypeValue.value.valueBlock.value;
          }
          // replace commonName dot and wildcard to underline
          if (!alias) {
            alias = commonName.replace(/\.|\*/g, '_');
          }

          this.stream.writeInt(xVersion);

          // how many cert+keypairs
          const keyCount = 1;
          this.stream.writeInt(keyCount);

          // privateKey tag
          this.stream.writeInt(JKS_PRIVATE_KEY_TAG);

          // commonName
          const aliasLength = Buffer.byteLength(alias.substring(0, 255));
          this.stream.writeUTF(alias);

          // date, like '0x0000018c11d02835'
          // set to PEM's notBefore
          let notBefore = parse.notBefore?.value;
          if (!notBefore) {
            notBefore = new Date();
          }
          this.stream.writeLong(notBefore.getTime());

          // detect is private der
          const privateKeyBuffer = Buffer.from(this.key.replace(/(-----(BEGIN|END)( (RSA|EC))? PRIVATE KEY-----)|[\n\r]+/g, ''), 'base64');

          let encryptedPrivateKeyBuffer = await this.encryptPrivateKey(privateKeyBuffer, password);

          this.stream.writeInt(encryptedPrivateKeyBuffer.byteLength);
          this.stream.write(encryptedPrivateKeyBuffer);

          // 正确解析证书链中的所有证书
          const certBuffers: Buffer[] = [];
          const certRegex = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
          let match;
          
          while ((match = certRegex.exec(this.cert)) !== null) {
            const certPem = match[0];
            const pem = certPem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|[\n\r]+/g, '');
            const pemBuffer = Buffer.from(pem, 'base64');
            certBuffers.push(pemBuffer);
          }
          
          // console.log(`JKS生成：处理了 ${certBuffers.length} 个证书`);
          
          if (certBuffers.length === 0) {
            throw new Error('无法从证书PEM中解析出有效的证书');
          }

          this.stream.writeInt(certBuffers.length);

          for (const certBuffer of certBuffers) {
            // tag for certificate
            if (xVersion === JKS_VERSION_2) {
              // certType
              const certType = 'X.509';
              this.stream.writeUTF(certType);
            }

            // append cert
            this.stream.writeInt(certBuffer.byteLength);
            this.stream.write(certBuffer);
          }

          const passwordDigest = new PasswordDigest(this.stream.getBufferCopy(), password);
          const sum = await passwordDigest.digist();

          this.stream.write(Buffer.from(sum));
          this.jks = this.stream.getBuffer();
        }

        return resolve(this.jks);
      } catch (error) {
        return reject(error);
      }
    });
  }
}


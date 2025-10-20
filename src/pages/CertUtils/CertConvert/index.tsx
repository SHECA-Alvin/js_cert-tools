import {parseCSR, parseCSRFile} from "@/services/api";
import {CloudUploadOutlined} from "@ant-design/icons";
import ProDescriptions from "@ant-design/pro-descriptions";
import ProForm from "@ant-design/pro-form";
import {ProFormSelect, ProFormText, ProFormCheckbox} from "@ant-design/pro-form";
import {Button, Input, Upload, Alert, Select, message, Row} from "antd";
import React, {useState, useRef} from "react";
import styles from "./index.less";
import {Spin} from "antd/es";
import TipInfo from "@/components/Footer/tipInfo";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Jks, { JKS_VERSION_1, JKS_VERSION_2 } from '@/utils/jks/jks';
import createPKCS12 from '@/utils/jks/forge-ext';
import * as forge from 'node-forge';
import * as asn1js from 'asn1js';
import { Certificate, PrivateKeyInfo, } from 'pkijs';
// import forge from 'node-forge';
// var forge = require('node-forge');


const { Dragger } = Upload;

const ParseCSR: React.FC = () => {
  const formRef = useRef()
  const [certificatePem, setCertificatePem] = useState<string>('');
  const [privateKeyPem, setPrivateKeyPem] = useState<string>('');
  const [fileType, setFileType] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [certFile, setCertFile] = useState<any>();
  const [keyFile, setKeyFile] = useState<any>();
  const alias = '123aaa'

  /**
   * Submit Method
   */
  const handleOnFinish = async () => {
    try {
      setLoading(true)
      let cert: string;
      let privateKey: string;
      
      if (fileType === 'pem') {
        if (!certificatePem || !privateKeyPem) {
          message.error('Please upload certificate and private key！')
          return;
        }
        
        // Verify whether the certificate and private key match
        const matchResult = await validateKeyPairMatch(certificatePem, privateKeyPem)
        
        if (!matchResult.isMatch) {
          message.error('Certificate and private key match failed')
          console.error('Certificate and private key match failed:', matchResult)
          return;
        }
        
        cert = certificatePem
        privateKey = privateKeyPem
      } else if (fileType === 'pfx') {
        // Extract certificate and private key from PFX file
        const pfxData = await readFileAsArrayBuffer({
          uid: Date.now().toString(),
          name: 'certificate.pem',
          status: 'done',
          originFileObj: certFile
        });
        const { cert: extractedCert, key: extractedKey } = await extractFromPfx(pfxData)
        cert = extractedCert;
        privateKey = extractedKey;
      } else if (fileType === 'jks') {
        // Extract certificate and private key from JKS file
        const jksData = await readFileAsArrayBuffer({
          uid: Date.now().toString(),
          name: 'certificate.pem',
          status: 'done',
          originFileObj: certFile
        })
        const { cert: extractedCert, key: extractedKey } = await extractFromJks(jksData)
        cert = extractedCert
        privateKey = extractedKey
      }
      // Download Certificate File
      downloadCertZip(cert, privateKey)
    } catch (error) {
      message.error('Certificate conversion failed')
      console.error('Certificate conversion failed:'+ (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const downloadCertZip = async (cert: string, privateKey: string) => { 
    // 生成转换后的文件
    const zip = new JSZip();
    const certName = getCertificateName(cert)
    
    for (const format of formRef.current?.getFieldValue('selectedFormats')) {
      await addFormatToZip(zip, format, cert, privateKey, certName);
    }

    // 获取当前时间
    const now = new Date();

    // 获取各个时间组件
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 月份从0开始，所以要+1
    const date = now.getDate();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // 下载ZIP文件
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `(${year}${month}${date}${hours}${minutes}${seconds})${certName}.zip`);
  }

  const readFileAsArrayBuffer = async (file: any) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      
      // 从NzUploadFile中提取实际的File对象
      const actualFile = file.originFileObj;
      if (actualFile && ((actualFile as any) instanceof File || (actualFile as any) instanceof Blob)) {
        reader.readAsArrayBuffer(actualFile as any);
      } else {
        reject(new Error('无效的文件对象：无法从NzUploadFile中获取originFileObj'));
      }
    });
  }
  /**
   * 
   * PFX TO PEM
   * @returns PEM
   */
  const extractFromPfx = async (pfxData) => {
    try {
      const pfxAsn1 = forge.asn1.fromDer(forge.util.createBuffer(pfxData));
      const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, formRef?.current?.getFieldValue('filePsd'))
      
      const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
      const certificates = certBags[forge.pki.oids.certBag];
      if (!certificates || certificates.length === 0) {
        throw new Error('Unable to extract certificate from PFX file');
      }
      
      // Get private key
      const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const key = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;
      if (!key) {
        throw new Error('Unable to extract private key from PFX file');
      }
      
      // Build certificate chain
      let leafCert: forge.pki.Certificate | null = null;
      const intermediateCerts: forge.pki.Certificate[] = [];
      const rootCerts: forge.pki.Certificate[] = [];
      
      // Certificate classification: Server certificate, Intermediate certificate, Root certificate
      for (const certBag of certificates) {
        const cert = certBag.cert;
        if (!cert) continue;
        
        const basicConstraints = cert.getExtension('basicConstraints') as any;
         const isCA = basicConstraints?.cA === true;
        const isSelfSigned = cert.subject.hash === cert.issuer.hash;
        
        if (!isCA && !isSelfSigned) {
          // leaf certificate
          leafCert = cert;
        } else if (isCA && isSelfSigned) {
          // Root certificate
          rootCerts.push(cert);
        } else if (isCA && !isSelfSigned) {
          // Intermediate certificate
          intermediateCerts.push(cert);
        }
      }
      
      // If no clear leaf certificate is found, use the first certificate as the leaf certificate
       if (!leafCert && certificates.length > 0) {
         leafCert = certificates[0].cert || null;
       }
      
      if (!leafCert) {
        throw new Error('Unable to determine the leaf certificate');
      }
      
      const certChainPems: string[] = [];
      
      // Add leaf certificate
      certChainPems.push(forge.pki.certificateToPem(leafCert));
      
      // Add Intermediate certificate,
      const sortedIntermediateCerts = sortCertificateChain(intermediateCerts, leafCert);
      for (const cert of sortedIntermediateCerts) {
        certChainPems.push(forge.pki.certificateToPem(cert));
      }
      
      // Add Root certificate
      for (const cert of rootCerts) {
        certChainPems.push(forge.pki.certificateToPem(cert));
      }
      
      const certChainPem = certChainPems.join('');
      const keyPem = forge.pki.privateKeyToPem(key);
      
      return { cert: certChainPem, key: keyPem };
    } catch (error) {
      console.error('PFX file parsing failed:', error);
      throw new Error('PFX file parsing failed');
    }
  }

  // 辅助方法：对中间证书进行排序，确保证书链的正确顺序
  const sortCertificateChain = (intermediateCerts: forge.pki.Certificate[], leafCert: forge.pki.Certificate) => {
    if (intermediateCerts.length <= 1) {
      return intermediateCerts;
    }
    
    const sortedCerts: forge.pki.Certificate[] = [];
    const remainingCerts = [...intermediateCerts];
    let currentIssuerHash = leafCert.issuer.hash;
    
    // 从叶子证书开始，按颁发者链向上查找
    while (remainingCerts.length > 0 && sortedCerts.length < intermediateCerts.length) {
      let found = false;
      for (let i = 0; i < remainingCerts.length; i++) {
        const cert = remainingCerts[i];
        if (cert.subject.hash === currentIssuerHash) {
          sortedCerts.push(cert);
          currentIssuerHash = cert.issuer.hash;
          remainingCerts.splice(i, 1);
          found = true;
          break;
        }
      }
      
      // 如果找不到下一个证书，跳出循环避免无限循环
      if (!found) {
        break;
      }
    }
    
    // 添加剩余的中间证书（如果有的话）
    sortedCerts.push(...remainingCerts);
    
    return sortedCerts;
  }
  /**
   * 
   * JKS TO PEM
   * @returns PEM
   */
  const extractFromJks = async (jksData: ArrayBuffer) => {
    try {
      // Parse from JKS file
      const jks = Jks.fromJKS(jksData, formRef?.current?.getFieldValue('filePsd'))
      
      // Extract certificate and private key in PEM format
      const pemResult = await jks.getPEM();
      
      if (!pemResult.cert || !pemResult.key) {
        throw new Error('Unable to extract certificate or private key from JKS file')
      }
      
      return {
        cert: pemResult.cert,
        key: pemResult.key
      };
    } catch (error) {
      console.error('JKS file parsing failed:', error);
      throw new Error('JKS file parsing failed: ' + (error as Error).message);
    }
  }

  const getCertificateName = (cert: string) => {
    try {
      const certificate = forge.pki.certificateFromPem(cert);
      const commonName = certificate.subject.getField('CN')?.value || 'certificate';
      return commonName.replace(/[^a-zA-Z0-9.-]/g, '_');
    } catch {
      return 'certificate';
    }
  }

  const addFormatToZip = async (zip: JSZip, format: string, cert: string, privateKey: string, certName: string) => {
    let folderName = '';
    let outputPassword = formRef.current?.getFieldValue('outFilePsd')
    
    try {
      switch (format) {
        case 'Apache':
          folderName = 'PEM_APACHE_F5'
          // Apache格式：叶子证书单独保存，证书链保存为ca-bundle.pem
          const { leafCert, certChain } = separateCertificateChain(cert);
          zip.file(`${folderName}/${certName}.cer`, leafCert);
          zip.file(`${folderName}/${certName}.key`, privateKey);
          if (certChain) {
            zip.file(`${folderName}/${certName}_ca.crt`, certChain);
          }
          break;
          
        case 'Nginx':
          folderName = 'PEM_NGINX'
          zip.file(`${folderName}/${certName}.cer`, cert);
          zip.file(`${folderName}/${certName}.crt`, cert);
          zip.file(`${folderName}/${certName}.pem`, cert);
          zip.file(`${folderName}/${certName}.key`, privateKey);
          break;
          
        case 'IIS':
          folderName = 'PFX-PKCS12-P12-IIS_EXCHANGE'
          const pfxBase64 = await generatePfx(cert, privateKey, outputPassword);
          zip.file(`${folderName}/cert.pfx`, pfxBase64, { base64: true });
          
          // 添加密码文件
          zip.file(`${folderName}/password.txt`, outputPassword);
          
          // 添加证书链文件到 IIS/chain 文件夹
          await addCertificateChainToZip(zip, cert, folderName);
          
          // 添加安装程序
          try {
            // const installerBlob = await bat();
            // zip.file(`${folderName}/双击安装PFX证书.exe`, installerBlob);
          } catch (error) {
            console.warn('添加安装程序失败:', error);
          }
          break;

        case 'Java':
          // 生成JKS v1版本  Tomcat  8.5-
          const jksV1Buffer = await generateJks(cert, privateKey, outputPassword, JKS_VERSION_1);
          zip.file(`JKS_JBOSS_TOMCAT_WEBLOGIC/${certName}.jks`, jksV1Buffer);
          zip.file(`JKS_JBOSS_TOMCAT_WEBLOGIC/password.txt`, outputPassword);
          
          // 生成JKS v2版本  Tomcat  8.5+ 
          const jksV2Buffer = await generateJks(cert, privateKey, outputPassword, JKS_VERSION_2);
          zip.file(`JKS_TOMCAT8.5+/tomcat.jks`, jksV2Buffer);
          zip.file(`JKS_TOMCAT8.5+/password.txt`, outputPassword);
          break;
      }
    } catch (error) {
      console.error(`添加${format}格式文件时出错:`, error);
      throw error;
    }
  }

  const separateCertificateChain = (certChainPem: string) => {
    const certArray = parseCertificateChain(certChainPem);
    
    if (certArray.length === 0) {
      throw new Error('证书链为空');
    }
    
    // 第一个证书是叶子证书
    const leafCert = certArray[0];
    
    // 如果只有一个证书，则没有证书链
    if (certArray.length === 1) {
      console.log('Apache格式：只有叶子证书，无证书链');
      return { leafCert, certChain: null };
    }
    
    // 其余证书组成证书链
    const certChain = certArray.slice(1).join('');
    console.log(`Apache格式：分离完成 - 叶子证书1个，证书链${certArray.length - 1}个证书`);
    
    return { leafCert, certChain };
  }

  const parseCertificateChain = (certChainPem: string) =>{
    const certArray: string[] = [];
    const certRegex = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
    let match;
    
    while ((match = certRegex.exec(certChainPem)) !== null) {
      certArray.push(match[0]);
    }
    
    console.log(`证书链解析完成，包含 ${certArray.length} 个证书`);
    return certArray;
  }

  /**
   * PEM TO PFX
   * @param cert 
   * @param privateKey 
   * @param password 
   * @returns pfxBase64
   */
  const generatePfx = (cert: string, privateKey: string, password: string) => {
    // Parse the certificate chain string into a certificate array
    const certArray = parseCertificateChain(cert);
    
    const pfxBase64 = createPKCS12(privateKey, certArray, password, {
      friendlyName: alias,
      algorithm: '3des'
    });
    return pfxBase64;
  }

  // 添加证书链文件到IIS/chain文件夹
  const addCertificateChainToZip = (zip: JSZip, cert: string, folderName: string) =>{
    try {
      const certArray = parseCertificateChain(cert);
      
      // 跳过第一个证书（域名证书），处理其余的证书链
      for (let i = 1; i < certArray.length; i++) {
        const certPem = certArray[i];
        const certificate = forge.pki.certificateFromPem(certPem);
        
        // 获取签发者和主题的CN字段
        const issuerCN = certificate.issuer.getField('CN')?.value || 'Unknown_Issuer';
        const subjectCN = certificate.subject.getField('CN')?.value || 'Unknown_Subject';
        
        // 清理文件名中的特殊字符
        const cleanIssuer = issuerCN.replace(/[^a-zA-Z0-9.-]/g, '_');
        const cleanSubject = subjectCN.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        // 生成文件名：签发者_cross_主题.cer
        const fileName = `${cleanIssuer}_cross_${cleanSubject}.cer`;
        
        // 添加到zip的chain文件夹中
        zip.file(`${folderName}/chain/${fileName}`, certPem);
        
        console.log(`添加证书链文件: ${fileName}`);
      }
      
      console.log(`IIS证书链处理完成，共处理 ${certArray.length - 1} 个证书链文件`);
    } catch (error) {
      console.error('添加证书链文件失败:', error);
      throw error;
    }
  }

  /**
   * PEM TO JKS
   * @param JKS_VERSION_1（Tomcat  8.5-）
   * @param JKS_VERSION_2（Tomcat  8.5+）
   * @returns jksBuffer
   */
  const generateJks = (cert: string, privateKey: string, password: string, version: JKS_VERSION_1 | JKS_VERSION_2 = JKS_VERSION_2) => {
    const jks = Jks.fromPEM(cert, privateKey, password);
    const jksBuffer = jks.getJKS(version, password, alias);
    return jksBuffer;
  }

  const uploadCertProps = {
    maxCount: 1,
    multiple: false,
    beforeUpload: (file: any) => {
      setCertFile(file)

      setFileType('pem')
      if (file?.name.includes('.pfx')) setFileType('pfx')
      if (file?.name.includes('.jks')) setFileType('jks')
      

      const reader = new FileReader()
      reader.onload = (e) => {
        setCertificatePem(e.target?.result as string)
      }
      reader.readAsText(file)
      return false
    },
  }

  const uploadKeyProps = {
    maxCount: 1,
    multiple: false,
    beforeUpload: (file: any) => {
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setPrivateKeyPem(e.target?.result as string)
      }
      reader.readAsText(file)
      return false
    },
  }

  /**
   * 验证PEM证书和私钥的公钥是否匹配
   */
  const validateKeyPairMatch = async (certContent: string, keyContent: string) => {
    try {
      console.log('开始验证证书和私钥的公钥匹配');
      
      // 提取证书的公钥
      const certPublicKey = await extractPublicKeyFromCertificate(certContent);
      if (!certPublicKey) {
        return {
          isMatch: false,
          message: '无法从证书中提取公钥',
          details: '证书格式可能不正确或损坏'
        };
      }
      
      // 提取私钥的公钥
      const keyPublicKey = await extractPublicKeyFromPrivateKey(keyContent);
      if (!keyPublicKey) {
        return {
          isMatch: false,
          message: '无法从私钥中提取公钥',
          details: '私钥格式可能不正确或损坏'
        };
      }
      
      // 比较公钥
      const matchResult = await comparePublicKeys(certPublicKey, keyPublicKey);
      
      return matchResult;
      
    } catch (error) {
      console.error('公钥匹配验证失败:', error);
      return {
        isMatch: false,
        message: '公钥匹配验证失败',
        details: `验证过程中发生错误: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 从证书中提取公钥
   */
  // 从证书提取公钥 - 重构版本
  const extractPublicKeyFromCertificate = async (pemContent: string) => {
    console.log('📜 [证书解析] 开始从证书提取公钥');
    console.log('📜 [证书解析] 原始PEM内容长度:', pemContent.length);
    console.log('📜 [证书解析] 原始PEM内容前200字符:', pemContent.substring(0, 200));
    
    try {
      // 步骤1: PEM格式清理
      console.log('📜 [证书解析] 步骤1: 开始PEM格式清理');
      const cleanPem = cleanPemContent(pemContent, 'CERTIFICATE');
      console.log('📜 [证书解析] PEM清理完成，Base64长度:', cleanPem.length);
      console.log('📜 [证书解析] 清理后Base64前100字符:', cleanPem.substring(0, 100));
      
      // 步骤2: Base64解码和ASN.1解析
      console.log('📜 [证书解析] 步骤2: 开始Base64解码和ASN.1解析');
      const binaryData = base64ToArrayBuffer(cleanPem);
      console.log('📜 [证书解析] Base64解码完成，二进制数据长度:', binaryData.byteLength);
      
      // 验证二进制数据的最小长度
      if (binaryData.byteLength < 100) {
        throw new Error(`证书数据太短，可能已损坏。当前长度: ${binaryData.byteLength} 字节`);
      }
      
      const asn1Result = parseAsn1(cleanPem);
      console.log('📜 [证书解析] ASN.1解析完成');
      console.log('📜 [证书解析] ASN.1结构类型:', asn1Result.constructor.name);
      console.log('📜 [证书解析] ASN.1值块信息:', asn1Result.valueBlock ? '存在' : '不存在');
      
      // 步骤2.5: ASN.1数据验证和完整性检查
      console.log('📜 [证书解析] 步骤2.5: 开始ASN.1数据验证');
      if (!asn1Result) {
        throw new Error('ASN.1解析结果为空');
      }
      
      if (!asn1Result.valueBlock) {
        throw new Error('ASN.1结构缺少值块，数据可能已损坏');
      }
      
      // 验证ASN.1结构是否为序列
      if (asn1Result.constructor.name !== 'Sequence') {
        console.warn('📜 [证书解析] 警告: ASN.1根结构不是Sequence类型，而是:', asn1Result.constructor.name);
      }
      
      // 验证序列是否包含足够的元素（证书通常包含3个主要部分：tbsCertificate, signatureAlgorithm, signature）
      if (asn1Result.valueBlock.value && asn1Result.valueBlock.value.length < 3) {
        throw new Error(`证书ASN.1结构元素不足，期望至少3个，实际: ${asn1Result.valueBlock.value.length}`);
      }
      
      console.log('📜 [证书解析] ASN.1数据验证通过');
      console.log('📜 [证书解析] ASN.1序列元素数量:', asn1Result.valueBlock.value ? asn1Result.valueBlock.value.length : '未知');
      
      // 步骤3: 创建证书对象并提取公钥信息
      console.log('📜 [证书解析] 步骤3: 创建证书对象');
      let certificate;
      try {
        certificate = new Certificate({ schema: asn1Result });
        console.log('📜 [证书解析] 证书对象创建成功');
      } catch (certError) {
        console.error('📜 [证书解析] 证书对象创建失败，详细错误:', certError);
        console.error('📜 [证书解析] ASN.1结构详情:', {
          type: asn1Result.constructor.name,
          hasValueBlock: !!asn1Result.valueBlock,
          valueBlockType: asn1Result.valueBlock ? asn1Result.valueBlock.constructor.name : 'N/A',
          elementCount: asn1Result.valueBlock?.value?.length || 0
        });
        throw new Error(`证书对象创建失败: ${certError instanceof Error ? certError.message : String(certError)}`);
      }
      
      const publicKeyInfo = certificate.subjectPublicKeyInfo;
      console.log('📜 [证书解析] 公钥信息提取成功');
      console.log('📜 [证书解析] 公钥算法ID:', publicKeyInfo.algorithm.algorithmId);
      console.log('📜 [证书解析] 公钥算法参数:', publicKeyInfo.algorithm.algorithmParams ? '存在' : '不存在');
      console.log('📜 [证书解析] 公钥数据长度:', publicKeyInfo.subjectPublicKey.valueBlock.valueHex.byteLength);
      
      // 步骤4: 导入公钥
      console.log('📜 [证书解析] 步骤4: 开始导入公钥到WebCrypto');
      const cryptoKey = await importPublicKey(publicKeyInfo);
      if (!cryptoKey) {
        throw new Error('公钥导入失败');
      }
      console.log('📜 [证书解析] 公钥导入成功');
      console.log('📜 [证书解析] 导入的公钥类型:', cryptoKey.type);
      console.log('📜 [证书解析] 导入的公钥算法:', cryptoKey.algorithm);
      
      return cryptoKey;
      
    } catch (error) {
      console.error('📜 [证书解析] 解析过程中发生错误:', error);
      
      // 提供更详细的错误信息
      let errorMessage = '证书解析失败';
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
        
        // 根据错误类型提供更具体的建议
        if (error.message.includes('DataError')) {
          errorMessage = '证书数据格式错误，请检查证书文件是否完整且格式正确';
        } else if (error.message.includes('ASN.1')) {
          errorMessage = '证书ASN.1结构解析失败，可能是证书文件损坏或格式不正确';
        } else if (error.message.includes('Base64')) {
          errorMessage = 'Base64解码失败，请检查证书文件编码是否正确';
        } else if (error.message.includes('PEM')) {
          errorMessage = 'PEM格式处理失败，请确保证书文件包含正确的PEM标记';
        }
      }
      
      console.error('📜 [证书解析] 错误详情:', {
        message: errorMessage,
        originalError: error,
        stack: errorDetails,
        pemLength: pemContent?.length || 0,
        pemPreview: pemContent?.substring(0, 100) || 'N/A'
      });
      
      // 抛出包含更多上下文信息的错误
      const enhancedError = new Error(`证书解析失败: ${errorMessage}`);
      (enhancedError as any).originalError = error;
      throw enhancedError;
    }
  }
  
  /**
   * 从私钥中提取公钥
   */
  const extractPublicKeyFromPrivateKey = async (keyContent: string) => {
    try {
      
      // 首先检测私钥格式
      const isPkcs1Rsa = keyContent.includes('-----BEGIN RSA PRIVATE KEY-----');
      const isPkcs1Ec = keyContent.includes('-----BEGIN EC PRIVATE KEY-----');
      const isPkcs8 = keyContent.includes('-----BEGIN PRIVATE KEY-----') || keyContent.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----');
      
      console.log('🔑 [私钥解析] 格式检测结果:', {
        isPkcs1Rsa,
        isPkcs1Ec,
        isPkcs8
      });

      // 尝试PKCS#8格式
      if (isPkcs8) {
        console.log('🔑 [私钥解析] 尝试PKCS#8格式解析');
        try {
          const cleanContent = cleanPemContent(keyContent, 'PRIVATE KEY');
          if (cleanContent) {
            const binaryData = base64ToArrayBuffer(cleanContent);
            const asn1 = asn1js.fromBER(binaryData);
            if (asn1.offset !== -1) {
              const privateKeyInfo = new PrivateKeyInfo({ schema: asn1.result });
              const publicKeyData = await extractPublicKeyFromPkcs8(privateKeyInfo);
              if (publicKeyData) {
                console.log('🔑 [私钥解析] PKCS#8格式解析成功');
                return await importPublicKey(publicKeyData);
              }
            }
          }
        } catch (error) {
          console.warn('🔑 [私钥解析] PKCS#8格式解析失败:', error);
        }
      }
      
      // 尝试PKCS#1 RSA格式
      if (isPkcs1Rsa) {
        console.log('🔑 [私钥解析] 尝试PKCS#1 RSA格式解析');
        try {
          // 使用专门的RSA私钥清理方法
          const cleanContent = cleanRsaPkcs1Content(keyContent);
          if (cleanContent) {
            const binaryData = base64ToArrayBuffer(cleanContent);
            const publicKeyData = await createRsaPublicKeyInfo(binaryData);
            if (publicKeyData) {
              console.log('🔑 [私钥解析] PKCS#1 RSA格式解析成功');
              return await importPublicKey(publicKeyData);
            }
          }
        } catch (error) {
          console.warn('🔑 [私钥解析] PKCS#1 RSA格式解析失败:', error);
        }
      }
      
      // 尝试PKCS#1 EC格式
      if (isPkcs1Ec) {
        console.log('🔑 [私钥解析] 尝试PKCS#1 EC格式解析');
        try {
          // 使用专门的EC私钥清理方法
          const cleanContent = cleanEcPkcs1Content(keyContent);
          if (cleanContent) {
            const binaryData = base64ToArrayBuffer(cleanContent);
            const publicKeyData = await createEcdsaPublicKeyInfo(binaryData);
            if (publicKeyData) {
              console.log('🔑 [私钥解析] PKCS#1 EC格式解析成功');
              return await importPublicKey(publicKeyData);
            }
          }
        } catch (error) {
          console.warn('🔑 [私钥解析] PKCS#1 EC格式解析失败:', error);
        }
      }
      
      // 如果所有格式都失败，尝试通用的PRIVATE KEY清理
      console.log('🔑 [私钥解析] 尝试通用私钥格式解析');
      try {
        const cleanContent = cleanPemContent(keyContent, 'PRIVATE KEY');
        if (cleanContent) {
          const binaryData = base64ToArrayBuffer(cleanContent);
          
          // 尝试作为RSA私钥解析
          try {
            const publicKeyData = await createRsaPublicKeyInfo(binaryData);
            if (publicKeyData) {
              console.log('🔑 [私钥解析] 通用格式RSA解析成功');
              return await importPublicKey(publicKeyData);
            }
          } catch (rsaError) {
            console.warn('🔑 [私钥解析] 通用格式RSA解析失败:', rsaError);
          }
          
          // 尝试作为EC私钥解析
          try {
            const publicKeyData = await createEcdsaPublicKeyInfo(binaryData);
            if (publicKeyData) {
              console.log('🔑 [私钥解析] 通用格式EC解析成功');
              return await importPublicKey(publicKeyData);
            }
          } catch (ecError) {
            console.warn('🔑 [私钥解析] 通用格式EC解析失败:', ecError);
          }
        }
      } catch (error) {
        console.warn('🔑 [私钥解析] 通用格式解析失败:', error);
      }
      
      throw new Error('不支持的私钥格式或私钥数据损坏');
    } catch (error) {
      console.error('🔑 [私钥解析] 从私钥提取公钥失败:', error);
      return null;
    }
  }

  /**
   * 清理PKCS#1 RSA私钥内容
   */
  const cleanRsaPkcs1Content = (pemContent: string) => {
    const regex = /-----BEGIN RSA PRIVATE KEY-----([\s\S]*?)-----END RSA PRIVATE KEY-----/;
    const match = pemContent.match(regex);
    if (!match) {
      throw new Error('未找到有效的RSA PRIVATE KEY PEM格式');
    }
    
    const cleanPem = match[1]
      .replace(/[\r\n\s]/g, '') // 移除所有换行符和空白字符
      .trim();
    
    if (!cleanPem || !/^[A-Za-z0-9+\/]*={0,2}$/.test(cleanPem)) {
      throw new Error('无效的Base64格式');
    }
    
    return cleanPem;
  }

  /**
   * 清理PKCS#1 EC私钥内容
   */
  const cleanEcPkcs1Content = (pemContent: string) => {
    const regex = /-----BEGIN EC PRIVATE KEY-----([\s\S]*?)-----END EC PRIVATE KEY-----/;
    const match = pemContent.match(regex);
    if (!match) {
      throw new Error('未找到有效的EC PRIVATE KEY PEM格式');
    }
    
    const cleanPem = match[1]
      .replace(/[\r\n\s]/g, '') // 移除所有换行符和空白字符
      .trim();
    
    if (!cleanPem || !/^[A-Za-z0-9+\/]*={0,2}$/.test(cleanPem)) {
      throw new Error('无效的Base64格式');
    }
    
    return cleanPem;
  }
  // 比较两个公钥
  const comparePublicKeys = async (key1: CryptoKey, key2: CryptoKey) => {
    try {
      // 导出两个公钥为SPKI格式进行比较
      const key1Buffer = await crypto.subtle.exportKey('spki', key1);
      const key2Buffer = await crypto.subtle.exportKey('spki', key2);
      
      // 比较二进制数据
      const key1Array = new Uint8Array(key1Buffer);
      const key2Array = new Uint8Array(key2Buffer);
      
      if (key1Array.length !== key2Array.length) {
        return {
          isMatch: false,
          message: '公钥不匹配',
          details: '公钥长度不同'
        };
      }
      
      for (let i = 0; i < key1Array.length; i++) {
        if (key1Array[i] !== key2Array[i]) {
          return {
            isMatch: false,
            message: '公钥不匹配',
            details: '公钥内容不同'
          };
        }
      }
      
      return {
        isMatch: true,
        message: '公钥匹配成功！',
        details: '两个文件包含相同的公钥'
      };
    } catch (error) {
      throw new Error(`公钥比较失败: ${error}`);
    }
  }

  // 统一的PEM清理工具函数
  const cleanPemContent = (pemContent: string, pemType: 'PRIVATE KEY' | 'CSR' | 'CERTIFICATE') => {
    let regex: RegExp;
    
    switch (pemType) {
      case 'PRIVATE KEY':
        regex = /-----BEGIN (?:PRIVATE KEY|RSA PRIVATE KEY|EC PRIVATE KEY)-----([\s\S]*?)-----END (?:PRIVATE KEY|RSA PRIVATE KEY|EC PRIVATE KEY)-----/;
        break;
      case 'CSR':
        regex = /-----BEGIN (?:CERTIFICATE REQUEST|NEW CERTIFICATE REQUEST)-----([\s\S]*?)-----END (?:CERTIFICATE REQUEST|NEW CERTIFICATE REQUEST)-----/;
        break;
      case 'CERTIFICATE':
        regex = /-----BEGIN (?:CERTIFICATE|X509 CERTIFICATE)-----([\s\S]*?)-----END (?:CERTIFICATE|X509 CERTIFICATE)-----/;
        break;
    }
    
    const match = pemContent.match(regex);
    if (!match) {
      throw new Error(`未找到有效的${pemType} PEM格式`);
    }
    
    const cleanPem = match[1]
      .replace(/[\r\n\s]/g, '') // 移除所有换行符和空白字符
      .trim();
    
    if (!cleanPem || !/^[A-Za-z0-9+\/]*={0,2}$/.test(cleanPem)) {
      console.log(cleanPem);
      throw new Error('无效的Base64格式' + cleanPem);
    }
    
    return cleanPem;
  }

  // Base64转ArrayBuffer的增强版本
  const base64ToArrayBuffer = (base64: string) => {
    if (!base64 || typeof base64 !== 'string') {
      throw new Error('Base64输入无效');
    }
    
    // 清理Base64字符串，移除所有空白字符
    let cleanBase64 = base64.replace(/[\s\r\n]/g, '');
    
    // 确保Base64字符串长度是4的倍数
    while (cleanBase64.length % 4 !== 0) {
      cleanBase64 += '=';
    }
    
    // 验证Base64格式
    if (!/^[A-Za-z0-9+\/]*={0,2}$/.test(cleanBase64)) {
      throw new Error('无效的Base64格式');
    }
    
    try {
      const binaryString = atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (error) {
      throw new Error('Base64解码失败: ' + (error as Error).message);
    }
  }

  // 统一的ASN.1解析工具函数
  const parseAsn1 = (base64Data: string) => {
    if (!base64Data || typeof base64Data !== 'string') {
      throw new Error('ASN.1解析输入数据无效');
    }
    
    const binaryData = base64ToArrayBuffer(base64Data);
    
    // 验证二进制数据的最小长度
    if (binaryData.byteLength < 10) {
      throw new Error(`ASN.1数据太短，可能已损坏。当前长度: ${binaryData.byteLength} 字节`);
    }
    
    const asn1 = asn1js.fromBER(binaryData);
    
    if (asn1.offset === -1) {
      throw new Error('无法解析ASN.1结构，数据格式可能损坏或不是有效的ASN.1编码');
    }
    
    if (!asn1.result) {
      throw new Error('ASN.1解析结果为空');
    }
    
    return asn1.result;
  }

  // 统一的公钥导入函数
  const importPublicKey = async (input: ArrayBuffer | any) => {
    try {
      let publicKeyBuffer: ArrayBuffer;
      
      if (input instanceof ArrayBuffer) {
        publicKeyBuffer = input;
      } else {
        // 从公钥信息对象生成SPKI格式
        try {
          // 方法1: 直接序列化
          publicKeyBuffer = input.toSchema().toBER();
          
          // 如果太短，尝试手动构建
          if (publicKeyBuffer.byteLength < 100) {
            const spkiSequence = new asn1js.Sequence({
              value: [
                new asn1js.Sequence({
                  value: [
                    new asn1js.ObjectIdentifier({ value: input.algorithm.algorithmId }),
                    input.algorithm.algorithmParams || new asn1js.Null()
                  ]
                }),
                input.subjectPublicKey
              ]
            });
            publicKeyBuffer = spkiSequence.toBER();
          }
        } catch (error) {
          // 备用方法
          const algorithmSequence = new asn1js.Sequence({
            value: [
              new asn1js.ObjectIdentifier({ value: input.algorithm.algorithmId }),
              input.algorithm.algorithmParams || new asn1js.Null()
            ]
          });
          
          const spkiSequence = new asn1js.Sequence({
            value: [
              algorithmSequence,
              input.subjectPublicKey
            ]
          });
          
          publicKeyBuffer = spkiSequence.toBER();
        }
      }
      
      // 获取算法参数
      let algorithmId: string = '1.2.840.113549.1.1.1'; // 默认RSA算法
      let algorithmParams: any = null;
      
      if (input instanceof ArrayBuffer) {
        // 从SPKI中解析算法信息
        try {
          const spkiAsn1 = asn1js.fromBER(publicKeyBuffer);
          if (spkiAsn1.offset !== -1 && spkiAsn1.result.valueBlock?.value) {
            const algorithmSeq = spkiAsn1.result.valueBlock.value[0];
            if (algorithmSeq.valueBlock?.value) {
              algorithmId = algorithmSeq.valueBlock.value[0].valueBlock.toString();
              if (algorithmSeq.valueBlock.value.length > 1) {
                algorithmParams = algorithmSeq.valueBlock.value[1];
              }
            }
          }
        } catch (error) {
          // 使用默认算法
          algorithmId = '1.2.840.113549.1.1.1'; // RSA
        }
      } else {
        algorithmId = input.algorithm.algorithmId;
        algorithmParams = input.algorithm.algorithmParams;
      }
      
      const importAlgorithm = getImportAlgorithm(algorithmId, algorithmParams);
      
      const cryptoKey = await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        importAlgorithm,
        true,
        ['verify']
      );
      
      return cryptoKey;
      
    } catch (error) {
      console.error('公钥导入失败:', error);
      return null;
    }
  }

  /**
   * 从PKCS#8私钥信息中提取公钥
   */
  const extractPublicKeyFromPkcs8 = async (privateKeyInfo: PrivateKeyInfo) => {
    try {
      const algorithm = privateKeyInfo.privateKeyAlgorithm.algorithmId;
      
      if (algorithm === '1.2.840.113549.1.1.1') { // RSA
        const privateKeyData = privateKeyInfo.privateKey.valueBlock.valueHex;
        return await createRsaPublicKeyInfo(privateKeyData);
      } else if (algorithm === '1.2.840.10045.2.1') { // ECDSA
        const privateKeyData = privateKeyInfo.privateKey.valueBlock.valueHex;
        const parameters = privateKeyInfo.privateKeyAlgorithm.algorithmParams;
        return await createEcdsaPublicKeyInfoFromPkcs8(privateKeyData, parameters);
      }
      
      throw new Error(`不支持的私钥算法: ${algorithm}`);
    } catch (error) {
      console.error('从PKCS#8提取公钥失败:', error);
      return null;
    }
  }

  /**
   * 创建RSA公钥信息
   */
  const createRsaPublicKeyInfo = (privateKeyData: ArrayBuffer) => {
    // try {
    //   const asn1 = asn1js.fromBER(privateKeyData);
    //   if (asn1.offset === -1) {
    //     throw new Error('无法解析RSA私钥');
    //   }
      
    //   const sequence = asn1.result as asn1js.Sequence;
    //   const values = sequence.valueBlock.value;
      
    //   if (values.length < 3) {
    //     throw new Error('RSA私钥格式不正确');
    //   }
      
    //   const modulus = values[1] as asn1js.Integer;
    //   const publicExponent = values[2] as asn1js.Integer;
      
    //   // 构造RSA公钥
    //   const rsaPublicKey = new asn1js.Sequence({
    //     value: [
    //       modulus,
    //       publicExponent
    //     ]
    //   });
      
    //   // 构造SubjectPublicKeyInfo
    //   const algorithmIdentifier = new asn1js.Sequence({
    //     value: [
    //       new asn1js.ObjectIdentifier({ value: '1.2.840.113549.1.1.1' }), // RSA
    //       new asn1js.Null()
    //     ]
    //   });
      
    //   const subjectPublicKeyInfo = new asn1js.Sequence({
    //     value: [
    //       algorithmIdentifier,
    //       new asn1js.BitString({ valueHex: rsaPublicKey.toBER(false) })
    //     ]
    //   });
      
    //   return subjectPublicKeyInfo.toBER(false);
    // } catch (error) {
    //   console.error('创建RSA公钥信息失败:', error);
    //   return null;
    // }

    try {
      
      const asn1 = asn1js.fromBER(privateKeyData);
      if (asn1.offset === -1) {
        console.error('🔧 [RSA公钥构造] ASN.1解析失败，offset为-1');
        throw new Error('无法解析RSA私钥的ASN.1结构');
      }
      
      if (!(asn1.result instanceof asn1js.Sequence)) {
        console.error('🔧 [RSA公钥构造] ASN.1结果不是Sequence类型');
        throw new Error('RSA私钥ASN.1结构必须是Sequence');
      }
      
      const sequence = asn1.result as asn1js.Sequence;
      const values = sequence.valueBlock.value;
      
      
      // PKCS#1 RSA私钥结构应该包含至少9个元素：
      // version, n, e, d, p, q, dp, dq, qinv
      if (values.length < 9) {
        console.error('🔧 [RSA公钥构造] RSA私钥元素数量不足，期望至少9个，实际:', values.length);
        
        // 尝试检查是否是简化的RSA私钥格式
        if (values.length >= 3) {
          console.log('🔧 [RSA公钥构造] 尝试解析简化RSA私钥格式');
          for (let i = 0; i < Math.min(values.length, 5); i++) {
            const element = values[i];
            console.log(`🔧 [RSA公钥构造] 元素[${i}]类型:`, element.constructor.name);
            if (element instanceof asn1js.Integer) {
              const intValue = element as asn1js.Integer;
              console.log(`🔧 [RSA公钥构造] 元素[${i}]值长度:`, intValue.valueBlock.valueHex.byteLength);
            }
          }
        }
        
        throw new Error(`RSA私钥格式不正确，期望至少9个元素，实际${values.length}个`);
      }
      
      // 验证每个元素都是Integer类型
      for (let i = 0; i < 9; i++) {
        if (!(values[i] instanceof asn1js.Integer)) {
          console.error(`🔧 [RSA公钥构造] 元素[${i}]不是Integer类型:`, values[i].constructor.name);
          throw new Error(`RSA私钥元素[${i}]必须是Integer类型`);
        }
      }
      const version = values[0] as asn1js.Integer;
      const modulus = values[1] as asn1js.Integer;
      const publicExponent = values[2] as asn1js.Integer;
      
      // 验证版本号（通常为0）
      if (version.valueBlock.valueDec !== 0) {
        console.warn('🔧 [RSA公钥构造] 警告：RSA私钥版本号不为0:', version.valueBlock.valueDec);
      }
      
      // 验证模数和公钥指数不为空
      if (modulus.valueBlock.valueHex.byteLength === 0) {
        throw new Error('RSA私钥模数为空');
      }
      
      if (publicExponent.valueBlock.valueHex.byteLength === 0) {
        throw new Error('RSA私钥公钥指数为空');
      }
      
      console.log('🔧 [RSA公钥构造] 开始构造RSA公钥');
      
      // 构造RSA公钥
      const rsaPublicKey = new asn1js.Sequence({
        value: [
          modulus,
          publicExponent
        ]
      });
      
      console.log('🔧 [RSA公钥构造] RSA公钥构造完成');
      
      // 构造SubjectPublicKeyInfo
      const algorithmIdentifier = new asn1js.Sequence({
        value: [
          new asn1js.ObjectIdentifier({ value: '1.2.840.113549.1.1.1' }), // RSA
          new asn1js.Null()
        ]
      });
      
      const subjectPublicKeyInfo = new asn1js.Sequence({
        value: [
          algorithmIdentifier,
          new asn1js.BitString({ valueHex: rsaPublicKey.toBER(false) })
        ]
      });
      
      const result = subjectPublicKeyInfo.toBER(false);
      console.log('🔧 [RSA公钥构造] 最终结果长度:', result.byteLength);
      
      return result;
    } catch (error) {
      console.error('🔧 [RSA公钥构造] 创建RSA公钥信息失败:', error);
      console.error('🔧 [RSA公钥构造] 错误堆栈:', (error as Error).stack);
      return null;
    }
  }

  /**
   * 创建ECDSA公钥信息
   */
  const createEcdsaPublicKeyInfo = (privateKeyData: ArrayBuffer) => {
    try {
      const asn1 = asn1js.fromBER(privateKeyData);
      if (asn1.offset === -1) {
        throw new Error('无法解析ECDSA私钥');
      }
      
      const sequence = asn1.result as asn1js.Sequence;
      const values = sequence.valueBlock.value;
      
      // 查找公钥字段（通常是带有上下文标签[1]的字段）
      let publicKeyBitString: asn1js.BitString | null = null;
      let curveOid: string | null = null;
      
      for (const value of values) {
        if (value instanceof asn1js.Constructed && value.idBlock.tagClass === 3 && value.idBlock.tagNumber === 1) {
          // 找到公钥字段
          if (value.valueBlock.value.length > 0 && value.valueBlock.value[0] instanceof asn1js.BitString) {
            publicKeyBitString = value.valueBlock.value[0] as asn1js.BitString;
          }
        } else if (value instanceof asn1js.Constructed && value.idBlock.tagClass === 3 && value.idBlock.tagNumber === 0) {
          // 找到曲线参数
          if (value.valueBlock.value.length > 0 && value.valueBlock.value[0] instanceof asn1js.ObjectIdentifier) {
            curveOid = (value.valueBlock.value[0] as asn1js.ObjectIdentifier).valueBlock.toString();
          }
        }
      }
      
      if (!publicKeyBitString || !curveOid) {
        throw new Error('无法从ECDSA私钥中提取公钥信息');
      }
      
      // 构造SubjectPublicKeyInfo
      const algorithmIdentifier = new asn1js.Sequence({
        value: [
          new asn1js.ObjectIdentifier({ value: '1.2.840.10045.2.1' }), // ECDSA
          new asn1js.ObjectIdentifier({ value: curveOid })
        ]
      });
      
      const subjectPublicKeyInfo = new asn1js.Sequence({
        value: [
          algorithmIdentifier,
          publicKeyBitString
        ]
      });
      
      return subjectPublicKeyInfo.toBER(false);
    } catch (error) {
      console.error('创建ECDSA公钥信息失败:', error);
      return null;
    }
  }

  // 统一的算法识别和导入参数生成
  const getImportAlgorithm = (algorithmId: string, algorithmParams?: any) => {
    if (algorithmId === '1.2.840.113549.1.1.1') { // RSA
      return {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      };
    } else if (algorithmId === '1.2.840.10045.2.1') { // ECDSA
      let namedCurve = 'P-256'; // 默认
      
      if (algorithmParams) {
        try {
          const curveOid = algorithmParams.valueBlock.toString();
          if (curveOid.includes('1.2.840.10045.3.1.7')) {
            namedCurve = 'P-256';
          } else if (curveOid.includes('1.3.132.0.34')) {
            namedCurve = 'P-384';
          } else if (curveOid.includes('1.3.132.0.35')) {
            namedCurve = 'P-521';
          }
        } catch (error) {
          // 使用默认曲线
        }
      }
      
      return {
        name: 'ECDSA',
        namedCurve: namedCurve
      };
    } else {
      throw new Error(`不支持的算法: ${algorithmId}`);
    }
  }

  /**
   * 从PKCS#8格式创建ECDSA公钥信息
   */
  const createEcdsaPublicKeyInfoFromPkcs8 = async (privateKeyData: ArrayBuffer, parameters: any) => {
    try {
      const asn1 = asn1js.fromBER(privateKeyData);
      if (asn1.offset === -1) {
        throw new Error('无法解析ECDSA私钥数据');
      }
      
      const sequence = asn1.result as asn1js.Sequence;
      const values = sequence.valueBlock.value;
      
      // 查找公钥字段
      let publicKeyBitString: asn1js.BitString | null = null;
      
      for (const value of values) {
        if (value instanceof asn1js.Constructed && value.idBlock.tagClass === 3 && value.idBlock.tagNumber === 1) {
          if (value.valueBlock.value.length > 0 && value.valueBlock.value[0] instanceof asn1js.BitString) {
            publicKeyBitString = value.valueBlock.value[0] as asn1js.BitString;
          }
        }
      }
      
      if (!publicKeyBitString) {
        throw new Error('无法从ECDSA私钥中提取公钥');
      }
      
      // 构造SubjectPublicKeyInfo
      const algorithmIdentifier = new asn1js.Sequence({
        value: [
          new asn1js.ObjectIdentifier({ value: '1.2.840.10045.2.1' }), // ECDSA
          parameters
        ]
      });
      
      const subjectPublicKeyInfo = new asn1js.Sequence({
        value: [
          algorithmIdentifier,
          publicKeyBitString
        ]
      });
      
      return subjectPublicKeyInfo.toBER(false);
    } catch (error) {
      console.error('从PKCS#8创建ECDSA公钥信息失败:', error);
      return null;
    }
  }
  

  return (
    <div className={styles.parseCSR}>
      <div>
        <div style={{width: '64%', margin: '0 auto 20px', fontWeight: 700}}>
          <h2>证书格式转换工具</h2>
          <h3>证书上传（PEM、PFX或JKS）</h3>
        </div>
        <div className={styles.container}>
          <div className={styles.main}>
            <div className={styles.upload}>
              <Dragger {...uploadCertProps}>
                <CloudUploadOutlined className={styles.uploadIcon}/>
                <p className={styles.uploadText}>上传证书文件</p>
              </Dragger>
            </div>
            {
              fileType === 'pem' ? (
                <div className={styles.upload} style={{marginLeft: '20px'}}>
                  <Dragger {...uploadKeyProps}>
                    <CloudUploadOutlined className={styles.uploadIcon}/>
                    <p className={styles.uploadText}>上传私钥文件</p>
                  </Dragger>
                </div>
              ) : null
            }
          </div>
          
          <ProForm
            style={{marginTop: '40px'}}
            formRef={formRef}
            layout="horizontal"
            onFinish={handleOnFinish}
            submitter={{
              searchConfig: {
                resetText: '重置',
                submitText: '开始转换',
              },
              render: (props, doms) => {
                return <Row style={{display: 'flex', justifyContent: 'center', marginTop: '80px'}}>{doms[1]}</Row>
                // []
              },
              submitButtonProps: {
                loading: loading,
              }
            }}
            initialValues={{
              selectedFormats: ['Apache', 'Nginx', 'IIS', 'Java'],
              outFilePsd: '123456'
            }}
            // {...formItemLayout}
            className={styles.form}
            labelCol={{span: 3}}
          >
            {
              ['pfx', 'jks'].includes(fileType) ? (
                <ProFormText.Password
                  name="filePsd"
                  label="文件密码"
                  placeholder='文件密码'
                  rules={[
                    {
                      required: true,
                      message: "请输入文件密码"
                    }
                  ]}
                />
              ) : null
            }

            <ProFormText.Password
              name="outFilePsd"
              label="导出密码"
              placeholder='导出密码（默认123456）'
              rules={[
                {
                  required: true,
                  message: "请输入导出密码"
                }
              ]}
            />

            <ProFormCheckbox.Group
              name="selectedFormats"
              label="输出格式"
              options={[
                { label: 'Apache', value: 'Apache'},
                { label: 'Nginx', value: 'Nginx'},
                { label: 'IIS (.pfx)', value: 'IIS'},
                { label: 'Java (.jks)', value: 'Java'},
              ]}
              rules={[{ required: true, message: "请选择格式" }]}
            />

          </ProForm>
        </div>
      </div>
      <TipInfo />
    </div>
  );
};

export default ParseCSR;

# SSL Certificate Format Conversion Tool



## Description

This tool is entirely implemented in JavaScript, sends no requests to the server, and can be used offline once resources are loaded!

The main functions of the tool are as follows:

1. Generate CSRs and private keys
2. Certificate format conversion (PEM-JKS and PEM-PFX mutual conversions)
3. Public-private key matching verification
4. Private key encryption and decryption

## Partial code logic

```javascript
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
```

## PEM TO PFX

```javascript
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

```

## PEM TO JKS

```javascript
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
```

## PFX TO PEM

```javascript
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

```

## JKS TO PEM

```javascript
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
```

## Generate CSR

```javascript
/*
* Generate CSR method
* By introducing an open-source library jsrsasign
*/
const jsCreatCsr = (values: any) => {
  if (typeof window?.crypto?.getRandomValues !== 'function') {
    message.error('Generation failed, please switch to a modern browser to proceed!')
    return
  }
  setCsrInfo({})
  let modal = GlobalMessage(
    {
      content: <div style={{display: 'flex', justifyContent: 'center', alignContent: 'center'}}><Spin tip="loading"/>
      </div>,
    }
  );
  const { keyParameter, signAlgorithm, encryptAlgorithm, commonName, orgName, orgCountry, orgRegion, orgCity } = values;
  let keypair: any, csrObj: any, privateKeyPEM: any, 
  let subject: any = { 
  }
  if (orgCountry) subject.C = orgCountry
  if (orgRegion) subject.ST = orgRegion
  if (orgCity) subject.L = orgCity
  if (orgName) subject.O = orgName
  if (commonName) subject.CN = commonName
  setTimeout(() => {
    if (encryptAlgorithm === 'RSA') {
      keypair = KEYUTIL.generateKeypair("RSA", Number(keyParameter));
      csrObj = new KJUR.asn1.csr.CertificationRequest({
        subject,
        sbjpubkey: keypair.pubKeyObj,
        sigalg: `${signAlgorithm}withRSA`,
        sbjprvkey: keypair.prvKeyObj
      });
    } else if (encryptAlgorithm === 'ECC') {
      let newKey
      if (keyParameter.indexOf('256') > -1) {
        newKey = 'secp256r1'
      } else if (keyParameter.indexOf('384') > -1) {
        newKey = 'secp384r1'
      } else if (keyParameter.indexOf('521') > -1) {
        newKey = 'secp521r1'
      }

      keypair = KEYUTIL.generateKeypair("EC", newKey);
      csrObj = new KJUR.asn1.csr.CertificationRequest({
        subject,
        sbjpubkey: keypair.pubKeyObj,
        sigalg: `${signAlgorithm}withECDSA`,
        sbjprvkey: keypair.prvKeyObj
      });
    }
    let ppp = KEYUTIL.getPEM(keypair?.prvKeyObj, "PKCS1PRV")
    if (['ECC', 'SM2'].includes(encryptAlgorithm)) {
      let index = ppp.indexOf('-----BEGIN EC PRIVATE KEY-----')
      if (index > -1) {
        privateKeyPEM = ppp.substring(index)
      }
    } else {
      privateKeyPEM = ppp
    }
    setCsrInfo({
      csr: csrObj?.getPEM(),
      privateKey: privateKeyPEM
    })
    modal?.destroy();

    // Private key encryption
    // 1.Parse private key
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPEM);
    
    // 2.Uniformly encrypt to PKCS#8 format
    const encryptedPrivateKey = forge.pki.encryptRsaPrivateKey(
      privateKey, 
      formRef?.current?.getFieldValue('psd'),
      {
        algorithm: 'aes256', 
        legacy: false     
      }
    );
    downloadZipFile({
      commonName, csr: csrObj?.getPEM() || csrSM2, privateKeyPEM: encryptedPrivateKey
    })
  }, 500)
}

```



Ant Design Pro provides some useful script to help you quick start and build with web project, code style check and test.

Scripts provided in `package.json`. It's safe to modify or add additional script;

## More

You can view full document on our [official website](https://pro.ant.design). And welcome any feedback in our [github](https://github.com/ant-design/ant-design-pro). 

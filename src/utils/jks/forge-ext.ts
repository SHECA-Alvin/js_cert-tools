import * as forge from "node-forge";
import { encryptSafeContents } from "./pkcs7";

const pki = forge.pki;
const asn1 = forge.asn1;
const p12 = forge.pkcs12;

function processOptions(options: any) {
  options.saltSize = options.saltSize || 8;
  options.count = options.count || 2048;
  options.algorithm = options.algorithm || options.encAlgorithm || "aes128";
  if (!("useMac" in options)) {
    options.useMac = true;
  }
  if (!("localKeyId" in options)) {
    options.localKeyId = null;
  }
  if (!("generateLocalKeyId" in options)) {
    options.generateLocalKeyId = true;
  }

  return options;
}

function createAttrs(options: any) {
  let attrs = [];

  let localKeyId = forge.random.getBytes(20);
  attrs.push(
    // localKeyID
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // attrId
      asn1.create(
        asn1.Class.UNIVERSAL,
        asn1.Type.OID,
        false,
        asn1.oidToDer(pki.oids.localKeyId).getBytes()
      ),
      // attrValues
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OCTETSTRING,
          false,
          localKeyId
        ),
      ]),
    ])
  );

  if ("friendlyName" in options) {
    attrs.push(
      // friendlyName
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // attrId
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OID,
          false,
          asn1.oidToDer(pki.oids.friendlyName).getBytes()
        ),
        // attrValues
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [
          asn1.create(
            asn1.Class.UNIVERSAL,
            asn1.Type.BMPSTRING,
            false,
            options.friendlyName
          ),
        ]),
      ])
    );
  }

  return attrs;
}

const createPKCS12 = (keyPem: any, cert: any, password: string, options: any) => {
  options = processOptions(options);

  const attrs = createAttrs(options);
  let bagAttrs;

  if (attrs.length > 0) {
    bagAttrs = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, attrs);
  }

  // collect contents for AuthenticatedSafe
  let contents = [];

  // create safe bag(s) for certificate chain
  let chain = [];
  if (cert !== null) {
    if (forge.util.isArray(cert)) {
      chain = cert;
    } else {
      chain = [cert];
    }
  }

  var certSafeBags = [];
  for (var i = 0; i < chain.length; ++i) {
    // convert cert from PEM as necessary
    cert = chain[i];
    //if(typeof cert === 'string') {
    //  cert = pki.certificateFromPem(cert);
    //}

    // SafeBag
    var certBagAttrs = i === 0 ? bagAttrs : undefined;
    //var certAsn1 = pki.certificateToAsn1(cert);

    var certDer = forge.pki.pemToDer(cert);
    var certAsn1 = forge.asn1.fromDer(certDer);

    var certSafeBag = asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.SEQUENCE,
      true,
      [
        // bagId
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OID,
          false,
          asn1.oidToDer(pki.oids.certBag).getBytes()
        ),
        // bagValue
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
          // CertBag
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
            // certId
            asn1.create(
              asn1.Class.UNIVERSAL,
              asn1.Type.OID,
              false,
              asn1.oidToDer(pki.oids.x509Certificate).getBytes()
            ),
            // certValue (x509Certificate)
            asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
              asn1.create(
                asn1.Class.UNIVERSAL,
                asn1.Type.OCTETSTRING,
                false,
                asn1.toDer(certAsn1).getBytes()
              ),
            ]),
          ]),
        ]),
        // bagAttributes (OPTIONAL)
        certBagAttrs as any,
      ]
    );
    certSafeBags.push(certSafeBag);
  }

  if (certSafeBags.length > 0) {
    // SafeContents
    var certSafeContents = asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.SEQUENCE,
      true,
      certSafeBags
    );

    /*
    // ContentInfo
    var certCI =
      // PKCS#7 ContentInfo
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // contentType
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
          // OID for the content type is 'data'
          asn1.oidToDer(pki.oids.data).getBytes()),
        // content
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
          asn1.create(
            asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
            asn1.toDer(certSafeContents).getBytes())
        ])
      ]);
    */
    contents.push(encryptSafeContents(certSafeContents as any, password, options));
  }

  // create safe contents for private key
  var keyBag = null;
  if (keyPem !== null) {
    // SafeBag
    let keyDer = forge.pki.pemToDer(keyPem);
    let key = forge.asn1.fromDer(keyDer);

    //var pkAsn1 = pki.wrapRsaPrivateKey(pki.privateKeyToAsn1(key));
    let pkAsn1 = key;

    if (password === null) {
      // no encryption
      keyBag = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // bagId
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OID,
          false,
          asn1.oidToDer(pki.oids.keyBag).getBytes()
        ),
        // bagValue
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
          // PrivateKeyInfo
          pkAsn1,
        ]),
        // bagAttributes (OPTIONAL)
        bagAttrs as any,
      ]);
    } else {
      // encrypted PrivateKeyInfo
      keyBag = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // bagId
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OID,
          false,
          asn1.oidToDer(pki.oids.pkcs8ShroudedKeyBag).getBytes()
        ),
        // bagValue
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
          // EncryptedPrivateKeyInfo
          pki.encryptPrivateKeyInfo(pkAsn1, password, options),
        ]),
        // bagAttributes (OPTIONAL)
        bagAttrs as any,
      ]);
    }

    // SafeContents
    var keySafeContents = asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.SEQUENCE,
      true,
      [keyBag]
    );

    // ContentInfo
    var keyCI =
      // PKCS#7 ContentInfo
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // contentType
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OID,
          false,
          // OID for the content type is 'data'
          asn1.oidToDer(pki.oids.data).getBytes()
        ),
        // content
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
          asn1.create(
            asn1.Class.UNIVERSAL,
            asn1.Type.OCTETSTRING,
            false,
            asn1.toDer(keySafeContents).getBytes()
          ),
        ]),
      ]);
    contents.push(keyCI);
  }

  // create AuthenticatedSafe by stringing together the contents
  var safe = asn1.create(
    asn1.Class.UNIVERSAL,
    asn1.Type.SEQUENCE,
    true,
    contents
  );

  var macData;
  if (options.useMac) {
    // MacData
    var sha1 = forge.md.sha1.create();
    var macSalt = new (forge.util as any).ByteBuffer(
      forge.random.getBytes(options.saltSize)
    );
    var count = options.count;
    // 160-bit key
    var key = p12.generateKey(password, macSalt, 3, count, 20);
    var mac = forge.hmac.create();
    mac.start(sha1 as any, key);
    mac.update(asn1.toDer(safe).getBytes());
    var macValue = (mac as any).getMac();
    macData = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // mac DigestInfo
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // digestAlgorithm
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
          // algorithm = SHA-1
          asn1.create(
            asn1.Class.UNIVERSAL,
            asn1.Type.OID,
            false,
            asn1.oidToDer(pki.oids.sha1).getBytes()
          ),
          // parameters = Null
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, ""),
        ]),
        // digest
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OCTETSTRING,
          false,
          macValue.getBytes()
        ),
      ]),
      // macSalt OCTET STRING
      asn1.create(
        asn1.Class.UNIVERSAL,
        asn1.Type.OCTETSTRING,
        false,
        macSalt.getBytes()
      ),
      // iterations INTEGER (XXX: Only support count < 65536)
      asn1.create(
        asn1.Class.UNIVERSAL,
        asn1.Type.INTEGER,
        false,
        (asn1 as any).integerToDer(count).getBytes()
      ),
    ]);
  }

  // PFX
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    // version (3)
    asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.INTEGER,
      false,
      (asn1 as any).integerToDer(3).getBytes()
    ),
    // PKCS#7 ContentInfo
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // contentType
      asn1.create(
        asn1.Class.UNIVERSAL,
        asn1.Type.OID,
        false,
        // OID for the content type is 'data'
        asn1.oidToDer(pki.oids.data).getBytes()
      ),
      // content
      asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OCTETSTRING,
          false,
          asn1.toDer(safe).getBytes()
        ),
      ]),
    ]),
    macData as any,
  ]);
};

const exportPKCS12 = (asn1: any) => {
  const p12Der = forge.asn1.toDer(asn1).getBytes();
  return forge.util.encode64(p12Der);
};

export default function (key: any, certificate: any, password: any, options: any) {
  return exportPKCS12(createPKCS12(key, certificate, password, options));
}

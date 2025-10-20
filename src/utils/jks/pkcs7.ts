import * as forge from "node-forge";

const pki = forge.pki;
const asn1 = forge.asn1;

export function encryptSafeContents(
  safeContents: string,
  password: string,
  options: any
) {
  const encryptionResult = encryptContent(safeContents, password, options);
  const encryptedContentInfo = createEncryptedContentInfo(encryptionResult);

  // ContentInfo type encrypted data
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.OID,
      false,
      // OID for the content type is 'encrypted-data'
      asn1.oidToDer(pki.oids.encryptedData).getBytes()
    ),
    asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
      createEncryptedData(encryptedContentInfo),
    ]),
  ]);
}

const encryptContent = function (
  safeContents: string,
  password: string,
  options: any
) {
  if (options.algorithm !== "3des")
    throw `Not supported for cert PBE: ${options.algorithm}`;

  options = setDefaults(options);

  const salt = forge.random.getBytesSync(options.saltSize);
  const saltBytes = new (forge.util as any).ByteBuffer(salt);
  const dkLen = 24;
  const iterations = options.count;

  var dk = (pki as any).pbe.generatePkcs12Key(password, saltBytes, 1, iterations, dkLen);
  var iv = (pki as any).pbe.generatePkcs12Key(password, saltBytes, 2, iterations, dkLen);
  var cipher = (forge as any).des.createEncryptionCipher(dk);
  cipher.start(iv);
  cipher.update(asn1.toDer(safeContents as any));
  cipher.finish();

  return {
    salt,
    iterations,
    encryptedContent: cipher.output.getBytes(),
  };
};

const setDefaults = function (options: any) {
  options = options || {};
  options.saltSize = options.saltSize || 8;
  options.count = options.count || 2048;
  options.prfAlgorithm = options.prfAlgorithm || "sha1";
  return options;
};

const createEncryptedContentInfo = function (encryptionResult: any) {
  //EncryptedContentInfo ::= SEQUENCE
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    // contentType
    asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.OID,
      false,
      // OID for the content type is 'data'
      asn1.oidToDer(pki.oids.data).getBytes()
    ),
    // ContentEncryptionAlgorithmIdentifier
    createContentEncryptionAlgorithm(
      encryptionResult.salt,
      encryptionResult.iterations
    ),
    // [0] IMPLICIT EncryptedContent ::= OCTET STRING
    asn1.create(
      asn1.Class.CONTEXT_SPECIFIC,
      0,
      false,
      encryptionResult.encryptedContent
    ),
  ]);
};

const createContentEncryptionAlgorithm = function (salt: any, iterations: any) {
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.OID,
      false,
      asn1.oidToDer((forge as any).oids["pbeWithSHAAnd3-KeyTripleDES-CBC"]).getBytes()
    ),
    // pkcs-12PbeParams
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // salt
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, salt),
      // iteration count
      asn1.create(
        asn1.Class.UNIVERSAL,
        asn1.Type.INTEGER,
        false,
        (asn1 as any).integerToDer(iterations).getBytes()
      ),
    ]),
  ]);
};

const createEncryptedData = function (encryptedContentInfo: any) {
  // EncryptedData
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    //version
    asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.INTEGER,
      false,
      (asn1 as any).integerToDer(0).getBytes()
    ),
    // EncryptedContentInfo
    encryptedContentInfo,
  ]);
};

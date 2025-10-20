import {request} from 'umi';

// 生成CSR
export async function generateCSR(params: any) {
  return request(`/v1/api/v1/tools/csr/generate`, {
    method: 'POST',
    data: params,
  });
}

// 解析CSR
export async function parseCSR(params: any) {
  return request(`/v1/api/v1/tools/csr/parse`, {
    method: 'POST',
    data: params,
  });
}


export async function parseCSRFile(params: any) {
  return request(`/v1/api/v1/tools/csr/parse/file`, {
    method: 'POST',
    data: params,
  });
}


// 验证SCT
export async function veritySct(params: any) {
  return request(`/v1/api/v1/tools/sct/verity`, {
    method: 'POST',
    data: params,
  });
}


export async function veritySctFile(params: any) {
  return request(`/v1/api/v1/tools/sct/verity/file`, {
    method: 'POST',
    data: params,
  });
}

// 解析证书
export async function parseCert(params: any) {
  return request(`/v1/api/v1/tools/cert/parse`, {
    method: 'POST',
    data: params,
  });
}

export async function parseCertFile(params: any) {
  return request(`/v1/api/v1/tools/cert/parse/file`, {
    method: 'POST',
    data: params,
  });
}


// 解析证书
export async function getCertChain(params: any) {
  return request(`/v1/api/v1/tools/cert/chain`, {
    method: 'POST',
    data: params,
  });
}

export async function getCertChainFile(params: any) {
  return request(`/v1/api/v1/tools/cert/chain/file`, {
    method: 'POST',
    data: params,
  });
}

// 格式转换
export async function formatCert(params: any) {
  return request(`/v1/api/v1/tools/cert/format`, {
    method: 'POST',
    data: params,
    responseType: 'formData',
  });
}

// 查询证书状态
export async function fetchCertState(params: any) {
  return request(`/v1/api/v1/tools/cert/state`, {
    method: 'POST',
    data: params,
  });
}

export async function queryDns(params: any) {
  return request(`/v1/api/v1/tools/dns/record`, {
    method: 'POST',
    data: params,
  });
}

export async function encryptKey(params: any) {
  return request(`/v1/api/v1/tools/key/encrypt`, {
    method: 'POST',
    data: params,
  });
}

export async function encryptKeyFile(params: any) {
  return request(`/v1/api/v1/tools/key/encrypt/file`, {
    method: 'POST',
    data: params,
  });
}

export async function matchKey(params: any) {
  return request(`/v1/api/v1/tools/key/match`, {
    method: 'POST',
    data: params,
  });
}

export async function keyDecrypt(params: any) {
  return request(`/v1/api/v1/tools/key/decrypt`, {
    method: 'POST',
    data: params,
  });
}


export async function keyDecryptFile(params: any) {
  return request(`/v1/api/v1/tools/key/decrypt/file`, {
    method: 'POST',
    data: params,
  });
}

export async function sslCheck(params: any, headers: any) {
  return request(`/v1/open-api/v2/tools/ssl-check/v2`, {
    method: 'POST',
    data: params,
    headers
  });
}

export async function getSealDom(params: any) {
  // return request(`http://localhost:3000/abc`, {
  return request(`/abc`, {
    method: 'POST',
    data: params,
  });
}

export async function domainVerify(params: any, headers?: any) {
  return request(`/v1/api/v1/tools/domain/verify`, {
    method: 'POST',
    data: params,
    headers
  });
}

export async function domainVerifyv2(params: any, headers?: any) {
  return request(`/v1/api/v1/tools/domain/verify-v2`, {
    method: 'POST',
    data: params,
    headers
  });
}

export async function sealDetail(params: any, headers?: any) {
  return request(`/v1/seal/detail`, {
    method: 'GET',
    params,
  });
}

export async function protocolInfo(params: any, headers?: any) {
  return request(`/v1/open-api/v2/tools/ssl-check/protocol-suite`, {
    method: 'POST',
    data: params,
    headers
  });
}





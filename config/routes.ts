export default [
  // {
  //   path: '/cert-utils',
  //   redirect: '/cert-utils/csr_create.html'
  // },
  // {
  //   path: '/cert-utils/csr_create.html',
  //   name: 'csr_create',
  //   component: './CertUtils/GenerateCSR',
  //   hideInMenu: true,
  // },
  {
    path: '/cert-convert',
    name: 'cert_convert',
    component: './CertUtils/CertConvert',
    hideInMenu: true,
  },
  {
    path: '/',
    redirect: '/cert-convert',
  },
  {
    component: './404',
  },
];

const LEFT_LIST = [
  { path: 'csr_create', title: '创建CSR' },
  { type: 'csr_decode', title: '解析CSR' },
  { type: 'key_encryption', title: '私钥加密' },
  { type: 'key_decryption', title: '私钥解密' },
  { type: 'key_match', title: '私钥匹配' },
  { type: 'cert_convert', title: '证书格式转换' },
  { type: 'cert_decode', title: '证书解析' },
  { type: 'cert_ct', title: '证书透明度验证' },
  { type: 'cert_chain', title: '获取证书链' },
  { type: 'ssl_check', title: '证书链检测' },
]
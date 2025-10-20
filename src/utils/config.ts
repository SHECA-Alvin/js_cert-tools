
const APP_ID = '2027863831';
import csrCreate from '../../public/csr-create.png'
import csrDecode from '../../public/csr-decode.png'
import keyJia from '../../public/key-jia.png'
import keyDecode from '../../public/key-decode.png'
import keyMatch from '../../public/key-match.png'
import certConvert from '../../public/cert-convert.png'
import certDecode from '../../public/cert-decode.png'
import certCt from '../../public/cert-ct.png'
import certChain from '../../public/cert-chain.png'
import sslCheck from '../../public/ssl-check.png'
import dnsQuery from '../../public/dns-query.png'

export const SSL_LIST = [
  {
    path: '/cert-utils/csr_create.html',
    title: '创建CSR',
    src: csrCreate
  },
  {
    path: '/cert-utils/csr_decode.html',
    title: '解析CSR',
    src: csrDecode
  },
  {
    path: '/cert-utils/key_encryption.html',
    title: '私钥加密',
    src: keyJia
  },
  {
    path: '/cert-utils/key_decryption.html',
    title: '私钥解密',
    src: keyDecode
  },
  {
    path: '/cert-utils/key_match.html',
    title: '私钥匹配',
    src: keyMatch
  },
  {
    path: '/cert-utils/cert_convert.html',
    title: '证书格式转换',
    src: certConvert
  },
  {
    path: '/cert-utils/cert_decode.html',
    title: '证书解析',
    src: certDecode
  },
  {
    path: '/cert-utils/cert_ct.html',
    title: '证书透明度验证',
    src: certCt
  },
  {
    path: '/cert-utils/cert_chain.html',
    title: '获取证书链',
    src: certChain
  },
  {
    path: '/cert-utils/ssl_check.html',
    title: '证书链检测',
    src: sslCheck
  },
  // {
  //   path: '/cert-utils/ssl_analyze.html',
  //   title: '证书信息拆解',
  //   src: sslCheck
  // },
]

export const CERT_LIST = [
  {
    path: '/dns_check.html',
    title: 'DNS查询',
    src: dnsQuery
  }
]

const COUNTRY_CODE = {
  CN: '中国',
  HK: '中国香港特别行政区',
  MO: '中国澳门特别行政区',
  TW: '中国台湾省',
  AD: '安道尔共和国',
  AE: '阿拉伯联合酋长国',
  AF: '阿富汗',
  AG: '安提瓜和巴布达',
  AI: '安圭拉岛',
  AL: '阿尔巴尼亚',
  AM: '亚美尼亚',
  AO: '安哥拉',
  AR: '阿根廷',
  AT: '奥地利',
  AU: '澳大利亚',
  AZ: '阿塞拜疆',
  BB: '巴巴多斯',
  BD: '孟加拉国',
  BE: '比利时',
  BF: '布基纳法索',
  BG: '保加利亚',
  BH: '巴林',
  BI: '布隆迪',
  BJ: '贝宁',
  BL: '巴勒斯坦',
  BM: '百慕大群岛',
  BN: '文莱',
  BO: '玻利维亚',
  BR: '巴西',
  BS: '巴哈马',
  BW: '博茨瓦纳',
  BY: '白俄罗斯',
  BZ: '伯利兹',
  CA: '加拿大',
  CF: '中非共和国',
  CG: '刚果',
  CH: '瑞士',
  CK: '库克群岛',
  CL: '智利',
  CM: '喀麦隆',
  CO: '哥伦比亚',
  CR: '哥斯达黎加',
  CU: '古巴',
  CY: '塞浦路斯',
  CZ: '捷克',
  DE: '德国',
  DJ: '吉布提',
  DK: '丹麦',
  DO: '多米尼加共和国',
  DZ: '阿尔及利亚',
  EC: '厄瓜多尔',
  EE: '爱沙尼亚',
  EG: '埃及',
  ES: '西班牙',
  ET: '埃塞俄比亚',
  FI: '芬兰',
  FJ: '斐济',
  FR: '法国',
  GA: '加蓬',
  GB: '英国',
  GD: '格林纳达',
  GE: '格鲁吉亚',
  GF: '法属圭亚那',
  GH: '加纳',
  GI: '直布罗陀',
  GM: '冈比亚',
  GN: '几内亚',
  GR: '希腊',
  GT: '危地马拉',
  GU: '关岛',
  GY: '圭亚那',
  HN: '洪都拉斯',
  HT: '海地',
  HU: '匈牙利',
  ID: '印度尼西亚',
  IE: '爱尔兰',
  IL: '以色列',
  IN: '印度',
  IQ: '伊拉克',
  IR: '伊朗',
  IS: '冰岛',
  IT: '意大利',
  JM: '牙买加',
  JO: '约旦',
  JP: '日本',
  KE: '肯尼亚',
  KG: '吉尔吉斯坦',
  KH: '柬埔寨',
  KP: '朝鲜',
  KR: '韩国',
  KT: '科特迪瓦共和国',
  KW: '科威特',
  KZ: '哈萨克斯坦',
  LA: '老挝',
  LB: '黎巴嫩',
  LC: '圣卢西亚',
  LI: '列支敦士登',
  LK: '斯里兰卡',
  LR: '利比里亚',
  LS: '莱索托',
  LT: '立陶宛',
  LU: '卢森堡',
  LV: '拉脱维亚',
  LY: '利比亚',
  MA: '摩洛哥',
  MC: '摩纳哥',
  MD: '摩尔多瓦',
  MG: '马达加斯加',
  ML: '马里',
  MM: '缅甸',
  MN: '蒙古',
  MS: '蒙特塞拉特岛',
  MT: '马耳他',
  MU: '毛里求斯',
  MV: '马尔代夫',
  MW: '马拉维',
  MX: '墨西哥',
  MY: '马来西亚',
  MZ: '莫桑比克',
  NA: '纳米比亚',
  NE: '尼日尔',
  NG: '尼日利亚',
  NI: '尼加拉瓜',
  NL: '荷兰',
  NO: '挪威',
  NP: '尼泊尔',
  NR: '瑙鲁',
  NZ: '新西兰',
  OM: '阿曼',
  PA: '巴拿马',
  PE: '秘鲁',
  PF: '法属玻利尼西亚',
  PG: '巴布亚新几内亚',
  PH: '菲律宾',
  PK: '巴基斯坦',
  PL: '波兰',
  PR: '波多黎各',
  PT: '葡萄牙',
  PY: '巴拉圭',
  QA: '卡塔尔',
  RO: '罗马尼亚',
  RU: '俄罗斯',
  SA: '沙特阿拉伯',
  SB: '所罗门群岛',
  SC: '塞舌尔',
  SD: '苏丹',
  SE: '瑞典',
  SG: '新加坡',
  SI: '斯洛文尼亚',
  SK: '斯洛伐克',
  SL: '塞拉利昂',
  SM: '圣马力诺',
  SN: '塞内加尔',
  SO: '索马里',
  SR: '苏里南',
  ST: '圣多美和普林西比',
  SV: '萨尔瓦多',
  SY: '叙利亚',
  SZ: '斯威士兰',
  TD: '乍得',
  TG: '多哥',
  TH: '泰国',
  TJ: '塔吉克斯坦',
  TM: '土库曼斯坦',
  TN: '突尼斯',
  TO: '汤加',
  TR: '土耳其',
  TT: '特立尼达和多巴哥',
  TZ: '坦桑尼亚',
  UA: '乌克兰',
  UG: '乌干达',
  US: '美国',
  UY: '乌拉圭',
  UZ: '乌兹别克斯坦',
  VC: '圣文森特岛',
  VE: '委内瑞拉',
  VN: '越南',
  YE: '也门',
  YU: '南斯拉夫',
  ZA: '南非',
  ZM: '赞比亚',
  ZR: '扎伊尔',
  ZW: '津巴布韦'
};

const KEY_PARAMETER = {
  ECC: ["P256(prime256v1)", "P384(secp384r1)", "P521(secp521r1)"],
  RSA: ["2048", "3072", "4096"],
  SM2: ["SMP256(sm2p256v1)"],
  CODESIGN:["4096"]
};

const SIGN_ALGORITHM = ["SHA256", "SHA384", "SHA512"];

export const ENCRYPT_ALGORITHM = {
  SSL: ["RSA", "ECC"],
  GM: ["SM2"],
  CODESIGN: ["RSA"],
}


const DNS_QUERY_TYPE = {
  'A': 'A',
  'CAA': 'CAA',
  'NS': 'NS',
  'CNAME': 'CNAME',
  'TXT': 'TXT',
  'MX': 'MX',
  'AAAA': 'AAAA',
};

export {
  APP_ID,
  COUNTRY_CODE,
  KEY_PARAMETER,
  SIGN_ALGORITHM,
  DNS_QUERY_TYPE,
}

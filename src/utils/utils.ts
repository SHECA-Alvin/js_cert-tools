import Base64 from 'base64-js';
import FileSaver from 'file-saver';
import moment from 'moment';

export function downLoadFile(file: any, name: string) {
  const values = Base64.toByteArray(file);
  const blob = new Blob([values]);
  FileSaver.saveAs(blob, name);
}

export function downLoadFileCert(file: any, name: string) {
  const blob = new Blob([file], { type: 'charset=ansi' });
  FileSaver.saveAs(blob, name);
}

export function formateTime(date: Date | number | string, format = 'YYYY-MM-DD HH:mm:ss') {
  return date ? moment(date).format(format) : '--';
}

export function formateMoney(value: number | string, options = { style: 'currency', currency: 'CNY' }) {
  return value >= 0 ? value?.toLocaleString('zh-CN', options) : '--';
}

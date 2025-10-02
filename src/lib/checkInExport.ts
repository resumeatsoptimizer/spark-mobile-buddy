const escapeCSV = (value: any): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportCheckInsToCSV = (checkIns: any[], eventTitle: string) => {
  const headers = ['ชื่อ', 'อีเมล', 'เวลาเช็คอิน', 'ประเภทตั๋ว', 'Station', 'วิธีการ'];
  
  const rows = checkIns.map(c => [
    c.registrations?.profiles?.name || '-',
    c.registrations?.profiles?.email || '-',
    new Date(c.checked_in_at).toLocaleString('th-TH'),
    c.registrations?.ticket_types?.name || '-',
    c.station_id || '-',
    c.check_in_method
  ]);
  
  const csv = [headers, ...rows]
    .map(row => row.map(escapeCSV).join(','))
    .join('\n');
  
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `check-ins-${eventTitle}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

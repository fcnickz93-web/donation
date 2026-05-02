/**
 * Pix EMV/BRCode generator — padrão oficial Banco Central do Brasil
 * Gera o código "Copia e Cola" (BRCode) com CRC-16/CCITT-FALSE
 *
 * Referência: https://www.bcb.gov.br/content/estabilidadefinanceira/forumpagamentosvarejo/Acoes_e_projetos_Manual-BR_Code.pdf
 */

const PIX_GUI = "BR.GOV.BCB.PIX";

function emvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function buildMerchantAccountInfo(pixKey: string): string {
  const gui = emvField("00", PIX_GUI);
  const key = emvField("01", pixKey);
  return emvField("26", gui + key);
}

function buildAdditionalData(txid: string): string {
  const sanitized = txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  return emvField("62", emvField("05", sanitized));
}

/**
 * CRC-16/CCITT-FALSE
 * Polynomial: 0x1021, Init: 0xFFFF, RefIn: false, RefOut: false, XorOut: 0x0000
 */
function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface PixOptions {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount?: number;
  txid?: string;
  description?: string;
}

export function generatePixCode(options: PixOptions): string {
  const {
    pixKey,
    merchantName,
    merchantCity,
    amount,
    txid = "TRASHBOY",
    description,
  } = options;

  const safeName = merchantName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .slice(0, 25)
    .toUpperCase();

  const safeCity = merchantCity
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .slice(0, 15)
    .toUpperCase();

  let merchantAccountInfo = buildMerchantAccountInfo(pixKey);

  if (description) {
    const gui = emvField("00", PIX_GUI);
    const key = emvField("01", pixKey);
    const desc = emvField("02", description.slice(0, 72));
    merchantAccountInfo = emvField("26", gui + key + desc);
  }

  const fields: string[] = [
    emvField("00", "01"),
    emvField("01", "12"),
    merchantAccountInfo,
    emvField("52", "0000"),
    emvField("53", "986"),
  ];

  if (amount !== undefined && amount > 0) {
    fields.push(emvField("54", amount.toFixed(2)));
  }

  fields.push(emvField("58", "BR"));
  fields.push(emvField("59", safeName));
  fields.push(emvField("60", safeCity));
  fields.push(buildAdditionalData(txid));
  fields.push("6304");

  const payload = fields.join("");
  const checksum = crc16(payload);

  return payload + checksum;
}

export function formatCurrency(value: string): string {
  const numeric = value.replace(/\D/g, "");
  if (!numeric) return "";
  const number = parseFloat(numeric) / 100;
  return number.toFixed(2);
}

export function parseCurrencyInput(raw: string): number | undefined {
  const cleaned = raw.replace(",", ".").replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed) || parsed <= 0) return undefined;
  if (parsed > 999999.99) return undefined;
  return Math.round(parsed * 100) / 100;
}

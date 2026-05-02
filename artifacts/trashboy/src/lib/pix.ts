/**
 * Pix BRCode generator — usa o template oficial fornecido pelo usuário.
 *
 * Template base (sem valor):
 * 00020126440014BR.GOV.BCB.PIX0122contatocaufe@gmail.com5204000053039865802BR5901N6001C62070503***6304D321
 *
 * Quando um valor é informado, o campo 54 (Transaction Amount) é inserido
 * entre o campo de moeda (5303986) e o país (5802BR), e o CRC-16 é recalculado.
 *
 * CRC-16/CCITT-FALSE: Polynomial 0x1021, Init 0xFFFF
 */

const PIX_BEFORE_COUNTRY =
  "00020126440014BR.GOV.BCB.PIX0122contatocaufe@gmail.com520400005303986";

const PIX_FROM_COUNTRY =
  "5802BR5901N6001C62070503***6304";

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

/**
 * Gera o código Pix "Copia e Cola".
 * Se amount for fornecido e válido, insere o campo 54 antes do país e recalcula CRC.
 * Se amount for undefined, gera o código sem valor fixo (template original).
 */
export function generatePixCode(amount?: number): string {
  let payload: string;

  if (amount !== undefined && amount > 0) {
    const amountStr = amount.toFixed(2);
    const amountField =
      "54" + amountStr.length.toString().padStart(2, "0") + amountStr;
    payload = PIX_BEFORE_COUNTRY + amountField + PIX_FROM_COUNTRY;
  } else {
    payload = PIX_BEFORE_COUNTRY + PIX_FROM_COUNTRY;
  }

  return payload + crc16(payload);
}

/**
 * Converte string de input do usuário para número de reais.
 * Aceita formatos: "10", "10,50", "10.50"
 * Retorna undefined se inválido.
 */
export function parseCurrencyInput(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const cleaned = raw.replace(",", ".").replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed) || parsed <= 0) return undefined;
  if (parsed > 999999.99) return undefined;
  return Math.round(parsed * 100) / 100;
}

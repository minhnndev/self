export class Formatter {
  static MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH = 40;

  static formatName(input: string): [string, string] {
    let lastName = "";
    let firstName = "";
    let i = 0;

    while (i < input.length && input[i] !== "<") {
      lastName += input[i];
      i++;
    }

    i += 2;

    while (i < input.length) {
      if (input[i] === "<") {
        if (i + 1 < input.length && input[i + 1] === "<") {
          break;
        }
        firstName += " ";
      } else {
        firstName += input[i];
      }
      i++;
    }

    return [firstName, lastName];
  }

  static formatDate(date: string): string {
    if (date.length !== 6) {
      throw new Error("InvalidDateLength");
    }

    const dateBytes = Array.from(date);

    for (let i = 0; i < 6; i++) {
      if (dateBytes[i] < "0" || dateBytes[i] > "9") {
        throw new Error("InvalidAsciiCode");
      }
    }

    if (dateBytes[2] > "1" || (dateBytes[2] === "1" && dateBytes[3] > "2")) {
      throw new Error("InvalidMonthRange");
    }

    if (dateBytes[4] > "3" || (dateBytes[4] === "3" && dateBytes[5] > "1")) {
      throw new Error("InvalidDayRange");
    }

    const year = date.substring(0, 2);
    const month = date.substring(2, 4);
    const day = date.substring(4, 6);

    return `${day}-${month}-${year}`;
  }

  static numAsciiToUint(numAscii: number): number {
    if (numAscii < 48 || numAscii > 57) {
      throw new Error("InvalidAsciiCode");
    }
    return numAscii - 48;
  }

  static fieldElementsToBytes(publicSignals: [bigint, bigint, bigint]): Uint8Array {
    const bytesCount = [31, 31, 31];
    const totalLength = 93;
    const bytesArray = new Uint8Array(totalLength);
    let index = 0;
    for (let i = 0; i < 3; i++) {
      let element = publicSignals[i];
      for (let j = 0; j < bytesCount[i]; j++) {
        const byte = Number(element & 0xffn);
        bytesArray[index++] = byte;
        element = element >> 8n;
      }
    }
    return bytesArray;
  }

  static bytesToHexString(bytes: Uint8Array): string {
    return (
      "0x" +
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
  }

  static extractForbiddenCountriesFromPacked(
    revealedData_packed: string | string[],
    id_type: "passport" | "id",
  ): string[] {
    // If revealedData_packed is not an array, convert it to an array
    const packedArray = Array.isArray(revealedData_packed) ? revealedData_packed : [revealedData_packed];

    const bytesCount = id_type === "passport" ? [31, 31, 31] : [31, 31, 31, 27]; // nb of bytes in each of the first three field elements
    const bytesArray = packedArray.flatMap((element: string, index: number) => {
      const bytes = bytesCount[index] || 31; // Use 31 as default if index is out of range
      const elementBigInt = BigInt(element);
      const byteMask = BigInt(255); // 0xFF
      const bytesOfElement = [...Array(bytes)].map((_, byteIndex) => {
        return (elementBigInt >> (BigInt(byteIndex) * BigInt(8))) & byteMask;
      });
      return bytesOfElement;
    });

    return bytesArray.map((byte: bigint) => String.fromCharCode(Number(byte)));
  }

  static proofDateToUnixTimestamp(dateNum: number[]): number {
    if (dateNum.length !== 6) {
      throw new Error("Invalid dateNum length");
    }
    let date = "";
    for (let i = 0; i < 6; i++) {
      date += String.fromCharCode(48 + (dateNum[i] % 10));
    }
    return Formatter.dateToUnixTimestamp(date);
  }

  static dateToUnixTimestamp(date: string): number {
    if (date.length !== 6) {
      throw new Error("InvalidDateLength");
    }
    const yearPart = Formatter.substring(date, 0, 2);
    const monthPart = Formatter.substring(date, 2, 4);
    const dayPart = Formatter.substring(date, 4, 6);
    const year = Formatter.parseDatePart(yearPart) + 2000;
    const month = Formatter.parseDatePart(monthPart);
    const day = Formatter.parseDatePart(dayPart);
    return Formatter.toTimestamp(year, month, day);
  }

  static substring(str: string, startIndex: number, endIndex: number): string {
    return str.substring(startIndex, endIndex);
  }

  static parseDatePart(value: string): number {
    if (value.length === 0) {
      return 0;
    }
    let result = 0;
    for (let i = 0; i < value.length; i++) {
      const digit = value.charCodeAt(i) - 48;
      result = result * 10 + digit;
    }
    return result;
  }

  static toTimestamp(year: number, month: number, day: number): number {
    let timestamp = 0;
    const secondsInDay = 86400;
    for (let i = 1970; i < year; i++) {
      timestamp += Formatter.isLeapYear(i) ? 366 * secondsInDay : 365 * secondsInDay;
    }
    const monthDayCounts = [31, Formatter.isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    for (let i = 1; i < month; i++) {
      timestamp += monthDayCounts[i - 1] * secondsInDay;
    }
    timestamp += (day - 1) * secondsInDay;
    return timestamp;
  }

  static isLeapYear(year: number): boolean {
    if (year % 4 !== 0) {
      return false;
    } else if (year % 100 !== 0) {
      return true;
    } else if (year % 400 !== 0) {
      return false;
    } else {
      return true;
    }
  }
}

export class CircuitAttributeHandler {
  static ISSUING_STATE_START = 2;
  static ISSUING_STATE_END = 4;
  static NAME_START = 5;
  static NAME_END = 43;
  static PASSPORT_NUMBER_START = 44;
  static PASSPORT_NUMBER_END = 52;
  static NATIONALITY_START = 54;
  static NATIONALITY_END = 56;
  static DATE_OF_BIRTH_START = 57;
  static DATE_OF_BIRTH_END = 62;
  static GENDER_START = 64;
  static GENDER_END = 64;
  static EXPIRY_DATE_START = 65;
  static EXPIRY_DATE_END = 70;
  static OLDER_THAN_START = 88;
  static OLDER_THAN_END = 89;
  static OFAC_START = 90;
  static OFAC_END = 92;

  static getIssuingState(input: string | Uint8Array): string {
    const charcodes = this.normalizeInput(input);
    return this.extractStringAttribute(charcodes, this.ISSUING_STATE_START, this.ISSUING_STATE_END);
  }

  static getName(input: string | Uint8Array): [string, string] {
    const charcodes = this.normalizeInput(input);
    const rawName = this.extractStringAttribute(charcodes, this.NAME_START, this.NAME_END);
    return Formatter.formatName(rawName);
  }

  static getPassportNumber(input: string | Uint8Array): string {
    const charcodes = this.normalizeInput(input);
    return this.extractStringAttribute(charcodes, this.PASSPORT_NUMBER_START, this.PASSPORT_NUMBER_END);
  }

  static getNationality(input: string | Uint8Array): string {
    const charcodes = this.normalizeInput(input);
    return this.extractStringAttribute(charcodes, this.NATIONALITY_START, this.NATIONALITY_END);
  }

  static getDateOfBirth(input: string | Uint8Array): string {
    const charcodes = this.normalizeInput(input);
    const rawDate = this.extractStringAttribute(charcodes, this.DATE_OF_BIRTH_START, this.DATE_OF_BIRTH_END);
    return Formatter.formatDate(rawDate);
  }

  static getGender(input: string | Uint8Array): string {
    const charcodes = this.normalizeInput(input);
    return this.extractStringAttribute(charcodes, this.GENDER_START, this.GENDER_END);
  }

  static getExpiryDate(input: string | Uint8Array): string {
    const charcodes = this.normalizeInput(input);
    const rawDate = this.extractStringAttribute(charcodes, this.EXPIRY_DATE_START, this.EXPIRY_DATE_END);
    return Formatter.formatDate(rawDate);
  }

  static getOlderThan(input: string | Uint8Array): number {
    const charcodes = this.normalizeInput(input);
    const digit1 = Formatter.numAsciiToUint(charcodes[this.OLDER_THAN_START]);
    const digit2 = Formatter.numAsciiToUint(charcodes[this.OLDER_THAN_START + 1]);
    return digit1 * 10 + digit2;
  }

  static getPassportNoOfac(input: string | Uint8Array): number {
    const charcodes = this.normalizeInput(input);
    return charcodes[this.OFAC_START];
  }

  static getNameAndDobOfac(input: string | Uint8Array): number {
    const charcodes = this.normalizeInput(input);
    return charcodes[this.OFAC_START + 1];
  }

  static getNameAndYobOfac(input: string | Uint8Array): number {
    const charcodes = this.normalizeInput(input);
    return charcodes[this.OFAC_START + 2];
  }

  static compareOlderThan(input: string | Uint8Array, olderThan: number): boolean {
    const charcodes = this.normalizeInput(input);
    return this.getOlderThan(charcodes) >= olderThan;
  }

  /**
   * Performs selective OFAC checks based on provided flags.
   * @param input The input string or byte array containing passport attribute data.
   * @param checkPassportNo Whether to check the passport number OFAC status.
   * @param checkNameAndDob Whether to check the name and date of birth OFAC status.
   * @param checkNameAndYob Whether to check the name and year of birth OFAC status.
   * @returns True if all enabled checks pass (equal 1), false if any enabled check fails.
   * @remarks Checks are only performed for flags that are set to true. If a flag is false,
   * that particular check is considered to have passed regardless of its actual value.
   */
  static compareOfac(
    input: string | Uint8Array,
    checkPassportNo: boolean,
    checkNameAndDob: boolean,
    checkNameAndYob: boolean,
  ): boolean {
    const charcodes = this.normalizeInput(input);
    return (
      (!checkPassportNo || this.getPassportNoOfac(charcodes) === 1) &&
      (!checkNameAndDob || this.getNameAndDobOfac(charcodes) === 1) &&
      (!checkNameAndYob || this.getNameAndYobOfac(charcodes) === 1)
    );
  }

  private static normalizeInput(input: string | Uint8Array): Uint8Array {
    if (typeof input === "string") {
      if (input.startsWith("0x")) {
        const hex = input.slice(2);
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
        }
        return bytes;
      }
      return new TextEncoder().encode(input);
    }
    return input;
  }

  static extractStringAttribute(input: string | Uint8Array, start: number, end: number): string {
    const charcodes = this.normalizeInput(input);
    if (charcodes.length <= end) {
      throw new Error("INSUFFICIENT_CHARCODE_LEN");
    }
    const attributeBytes = charcodes.slice(start, end + 1);
    return new TextDecoder("utf-8").decode(attributeBytes);
  }
}

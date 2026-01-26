// Configuration
const API_ENDPOINT = 'http://103.163.97.35:8080/ords/cpabank_ws/cpa/payment/spyTransactions';
const SMS_ENDPOINT = 'http://localhost:9090/api/sms/send';
const EMAIL_ENDPOINT = 'http://localhost:9090/api/email/send';
const CONTROL_SERVER_PORT = 3000;
const CONTROL_SERVER_URL = `http://192.168.1.249:${CONTROL_SERVER_PORT}`;
const ENABLE_SMS = true;
const ENABLE_EMAIL = true;
const ENABLE_MANUAL_MUTE = true;
const ENABLE_RECOVERY_EMAIL = true;
const CHECK_INTERVAL = .5 * 60 * 1000; // 10 minutes in milliseconds
const PHONE_NUMBERS = ['01111111111'];
const EMAIL_ADDRESSES = ['example@gmail.com', 'example2@gmail.com'];

module.exports = {
  API_ENDPOINT,
  SMS_ENDPOINT,
  EMAIL_ENDPOINT,
  CONTROL_SERVER_PORT,
  CONTROL_SERVER_URL,
   ENABLE_SMS,
   ENABLE_EMAIL,
   ENABLE_MANUAL_MUTE,
  ENABLE_RECOVERY_EMAIL,
  CHECK_INTERVAL,
  PHONE_NUMBERS,
  EMAIL_ADDRESSES
};

const bcrypt = require("bcrypt");
const _ = require("lodash");
const axios = require("axios");
const otpGenerator = require('otp-generator');

const { User } = require('../Model/userModel');
const { Otp } = require('../Model/otpModel');

/* async function sendSMS(phoneNumbers, otp) {
    const url = "https://www.fast2sms.com/dev/bulkV2";
    const body = {
      numbers: phoneNumbers, // mobile number where you want to send otp i.e "9595585757,5757577575,5757757575"
      variables_values: otp, // any variable data that you want to send like otp
      route: "otp", // to send otp use "otp",
    };
    const res = await fetch(url, {
      method: "post",
      headers: {
        //Authorization: process.env.FAST2SMS_API_KEY,
        Authorization: "JET4kzYSvtCyOa7HWr0IlAesBpKbMmqGoFg1hiwNX5Lc38RuPZe5dGcTWw8PLfNQt1h42g0FOoJHAKk3",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log(data);
  } 
  //This is asking me to spend at least 100 INR to start using my service
  */

  
  const { Vonage } = require('@vonage/server-sdk')

    const vonage = new Vonage({
    //apiKey: 'YOUR_NEXMO_API_KEY',
    //apiSecret: 'YOUR_NEXMO_API_SECRET'
    apiKey: 'bf95a6af',
    apiSecret: '5qwbkyJvRGbZnLZI'
    });

    /* const sendSMS = async (toNumber, message) => {
    try {
        const params = {
        to: toNumber,
        from: 'YOUR_NEXMO_NUMBER',
        text: message
        };

        const response = await nexmoClient.message.sendSms(params);
        console.log('SMS sent successfully:', response);
    } catch (error) {
        console.error('Error sending SMS:', error);
    }
    }; */
    async function sendSMS(toNumber, message) {
        const params = {
            to: toNumber,
            //from: '917411718099',
            from: 'Vonage APIs',
            text: message
            };
        //await vonage.sms.send({to, from, text})
        await vonage.sms.send(params)
            .then(resp => { 
                console.log('Message sent successfully'); console.log(resp); })
            .catch(err => { 
                console.log('There was an error sending the messages.'); console.error(err); });
    }
 

module.exports.signUp = async (req, res) => {
    const user = await User.findOne({
        number: req.body.number
    });
    if (user) return res.status(400).send("User already registered!");
    const OTP = otpGenerator.generate(6, {
        digits: true, alphabets: false, upperCase: false, specialChars: false
    });
    const number = req.body.number;
    console.log(OTP);
    /* const greenwebsms = new URLSearchParams();
    greenwebsms.append('token', '05fa33c4cb50c35f4a258e85ccf50509');
    greenwebsms.append('to', `+${number}`);
    greenwebsms.append('message', `Verification Code ${OTP}`);
    axios.post('http://api.greenweb.com.bd/api.php', greenwebsms).then(response => {
        console.log(response.data);
    }); */
    //another method 2 send SMS:
    await sendSMS('+'+number, 'Verification Code is: ' +OTP);
    //
    const otp = new Otp({ number: number, otp: OTP });
    const salt = await bcrypt.genSalt(10)
    otp.otp = await bcrypt.hash(otp.otp, salt);
    const result = await otp.save();
    return res.status(200).send("Otp send successfully!");
}
module.exports.verifyOtp = async (req, res) => {
    const otpHolder = await Otp.find({
        number: req.body.number
    });
    if (otpHolder.length === 0) return res.status(400).send("You use an Expired OTP!");
    const rightOtpFind = otpHolder[otpHolder.length - 1];
    const validUser = await bcrypt.compare(req.body.otp, rightOtpFind.otp);

    if (rightOtpFind.number === req.body.number && validUser) {
        const user = new User(_.pick(req.body, ["number"]));
        const token = user.generateJWT();
        const result = await user.save();
        const OTPDelete = await Otp.deleteMany({
            number: rightOtpFind.number
        });
        return res.status(200).send({
            message: "User Registration Successfull!",
            token: token,
            data: result
        });
    } else {
        return res.status(400).send("Your OTP was wrong!")
    }
}
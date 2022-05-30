const Outpayment = require("../models/Outpayment.model");
let PayStack = require("paystack-node");
let APIKEY = process.env.PAYSTACK_TEST_SECRET_KEY;
const environment = process.env.NODE_ENV;
const paystack = new PayStack(APIKEY, environment);

const singlePayout = async (accountNumber, bankCode, amountToPay) => {
  try {
    const transactionPromise = await paystack.resolveAccountNumber({
      account_number: accountNumber,
      bank_code: bankCode,
    });
    console.log("transactionPromise response", transactionPromise.body.data);

    if (transactionPromise.body.status) {
      console.log("has a promise");
      const transferRecipientPromise = await paystack
        .createTransferRecipient({
          type: "nuban",
          name: transactionPromise.body.data.account_name,
          account_number: transactionPromise.body.data.account_number,
          bank_code: bankCode,
          currency: "NGN",
        })
        .catch((e) => console.log("transferRecipientPromise: ", e));

      if (transferRecipientPromise.body.status) {
        const initiateTransferPromise = await paystack
          .initiateTransfer({
            source: "balance",
            amount: amountToPay,
            recipient: transferRecipientPromise.body.data.recipient_code,
            reason: "Malamino payout",
          })
          .catch((err) => console.log("initiateTransferPromise: ", err));

        if (initiateTransferPromise.body.status) {
          console.log(
            "initiateTransferPromise response",
            initiateTransferPromise
          );
          return initiateTransferPromise.body.message;
        }
      }
    } else {
      console.log("no promise");
    }
  } catch (err) {
    throw new Error(err);
  }
};
exports.singlePayout = singlePayout;

const bulkPayout = async () => {
  try {
    const transferRecipients = [];
    const outPayments = await Outpayment.find({ temporaryPause: false });

    for (let i = 0; i < outPayments.length; i++) {
      let transactionPromise = await paystack.resolveAccountNumber({
        account_number: outPayments[i].accountNumber,
        bank_code: outPayments[i].bankCode,
      });
      console.log("transactionPromise response", transactionPromise.body.data);

      if (transactionPromise.body.status) {
        let transferRecipientPromise = await paystack
          .createTransferRecipient({
            type: "nuban",
            name: transactionPromise.body.data.account_name,
            account_number: transactionPromise.body.data.account_number,
            bank_code: outPayments[i].bankCode,
            currency: "NGN",
          })
          .catch((e) => console.log("transferRecipientPromise: ", e));

        if (transferRecipientPromise.body.status) {
          let transferData = {
            amount: outPayments[i].amount,
            reason: "Malamino payout",
            recipient: transferRecipientPromise.body.data.recipient_code,
          };
          transferRecipients.push(transferData);
          await Outpayment.findOneAndUpdate(
            { transactionReference: outPayments[i].transactionReference },
            {
              isCompleteTransaction: true,
            },
            { new: true }
          );
        }
      } else {
        console.log("no promise");
      }
    }
    const params = {
      currency: "NGN",
      source: "balance",
      transfers: transferRecipients,
    };

    const bulkTransferPromise = await paystack.initiateBulkTransfer(params);
    if (bulkTransferPromise.body.status) {
      console.log("bulkTransferPromise response", bulkTransferPromise);
      return bulkTransferPromise.body.message;
    }
  } catch (err) {
    throw new Error(err);
  }
};
exports.bulkPayout = bulkPayout;

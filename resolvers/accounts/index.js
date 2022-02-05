const Account = require("../../models/Account.model");
const Transaction = require("../../models/Transaction.model");
const { AuthenticationError } = require("apollo-server-errors");
const escapeRegexString = require("escape-regex-string");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
const { sendEmail } = require("../../utilities/email");
const emailTemplateSourceTransfer = fs.readFileSync(
  path.join(__dirname, "../../views", "transfer.html"),
  "utf8"
);
const templateTransfer = handlebars.compile(emailTemplateSourceTransfer);

const createTransaction = async (parent, args, context, info) => {
  if (context.validAccessToken && context.isVerified) {
    const {
      amount,
      transactionType,
      transactionReference,
      paymentFrom,
      paymentTo,
    } = args.payment;
    const realAmount = amount / 100;
    try {
      const transaction = new Transaction({
        userEmail: context.email,
        amount: realAmount,
        transactionReference,
        transactionType,
        paymentFrom,
        paymentTo,
      });
      const result = await transaction.save();

      return result;
    } catch (err) {
      throw new Error(err);
    }
  } else {
    throw new AuthenticationError(
      "You are not authorized to make this operation"
    );
  }
};
exports.createTransaction = createTransaction;

const completeTransaction = async (parent, args, context, info) => {
  const { id, transactionReference } = args;
  try {
    if (context.validAccessToken && context.isVerified) {
      const incompleteTransaction = await Transaction.findOne({
        id,
        transactionReference,
      });
      if (incompleteTransaction) {
        const transaction = await Transaction.findByIdAndUpdate(
          id,
          {
            isCompleteTransaction: true,
          },
          { new: true }
        );
        const oldAccount = await Account.findOne({
          userEmail: context.email,
          transactionReference,
        });
        const accountId = oldAccount.id;
        const newBalance = oldAccount.currentBalance + transaction.amount;
        const result = await Account.findByIdAndUpdate(
          accountId,
          {
            currentBalance: newBalance,
            lastCreditFrom: transaction.paymentFrom,
            lastPaymentTo: transaction.paymentTo,
            lastTransactionAmount: transaction.amount,
          },
          { new: true }
        );
        return transaction;
      } else {
        throw new Error(
          "You are not authorized to make this operation due to wrong parameters"
        );
      }
    } else {
      throw new Error("You are not authorized to make this operation");
    }
  } catch (error) {
    throw new Error(error);
  }
};
exports.completeTransaction = completeTransaction;

const getAccountBalance = async (parent, args, context, info) => {
  const userEmail = context.email;
  try {
    if (context.validAccessToken && context.isVerified) {
      const account = await Account.findOne({ userEmail });
      return account;
    } else {
      throw new Error(
        "You are not authorized to make this operation due to wrong parameters"
      );
    }
  } catch (error) {
    throw new Error(error);
  }
};
exports.getAccountBalance = getAccountBalance;

const getRecipients = async (parent, args, context, info) => {
  const { recipientEmail } = args;
  try {
    if (context.validAccessToken && context.isVerified) {
      const escapedEmail = recipientEmail.replace(/(<([^>]+)>)/gi, "");
      const $regex = escapeRegexString(escapedEmail);
      const recipient = await Account.find({ userEmail: { $regex } })
        .sort({ userEmail: -1 })
        .limit(10);
      return recipient;
    } else {
      throw new Error(
        "You are not authorized to make this operation due to wrong parameters"
      );
    }
  } catch (error) {
    throw new Error(error);
  }
};
exports.getRecipients = getRecipients;

const transferCredit = async (parent, args, context, info) => {
  const { transferValue, recipientEmail } = args.transfer;
  try {
    if (context.validAccessToken && context.isVerified) {
      const userEmail = context.email;
      const transactionReference = `${Math.ceil(Math.random() * 10e10)}`;

      const oldAccount = await Account.findOne({ userEmail });

      if (oldAccount.currentBalance >= transferValue) {
        const transaction = new Transaction({
          userEmail,
          amount: transferValue,
          transactionReference,
          transactionType: "platform-transfer",
          paymentFrom: userEmail,
          paymentTo: recipientEmail,
          isCompleteTransaction: true,
        });
        const resultTransaction = await transaction.save();

        const newBalance = oldAccount.currentBalance - transferValue;
        const result = await Account.findOneAndUpdate(
          { userEmail },
          {
            currentBalance: newBalance,
            lastPaymentTo: recipientEmail,
            lastTransactionAmount: transferValue,
          }
        );

        const recipientAccount = await Account.findOne({ recipientEmail });
        const newRecipientBalance =
          recipientAccount.currentBalance + transferValue;

        const newResult = await Account.findOneAndUpdate(
          { userEmail: recipientEmail },
          {
            currentBalance: newRecipientBalance,
            lastCreditFrom: userEmail,
            lastTransactionAmount: transferValue,
          }
        );

        const htmlToSender = templateTransfer({
          recipientName: recipientAccount.userName,
          senderName: oldAccount.userName,
          isRecipient: false,
          transferValue,
          senderEmail: userEmail,
          recipientEmail,
        });

        const htmlToRecipient = templateTransfer({
          recipientName: recipientAccount.userName,
          senderName: oldAccount.userName,
          isRecipient: true,
          transferValue,
          senderEmail: userEmail,
          recipientEmail,
        });
        const messageDataSender = {
          from: "Malamino <admin@malamino.com>",
          to: userEmail,
          subject: "Debit Alert - " + transactionReference,
          html: htmlToSender,
        };

        const messageDataRecipient = {
          from: "Malamino <admin@malamino.com>",
          to: recipientEmail,
          subject: "Credit Alert - " + transactionReference,
          html: htmlToRecipient,
        };
        sendEmail(messageDataSender);
        sendEmail(messageDataRecipient);
        return result;
      } else {
        throw new Error(
          "You have insufficient balance to make this transaction"
        );
      }
    } else {
      throw new Error("You are not authorized to make this operation");
    }
  } catch (error) {
    throw new Error(error);
  }
};
exports.transferCredit = transferCredit;

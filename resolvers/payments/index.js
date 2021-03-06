const Payment = require("../../models/Payment.model");
const User = require("../../models/User.model");
const Account = require("../../models/Account.model");
const Product = require("../../models/Product.model");
const Outpayment = require("../../models/Outpayment.model");
const Commission = require("../../models/Commission.model");
const { updateQuantity } = require("../../utilities/quantity-update");
const { singlePayout, bulkPayout } = require("../../utilities/payout");
let PayStack = require("paystack-node");
let APIKEY = process.env.PAYSTACK_TEST_SECRET_KEY;
const environment = process.env.NODE_ENV;
const paystack = new PayStack(APIKEY, environment);

const checkPaymentEligibility = async (parent, args, context, info) => {
  if (context.validAccessToken && context.isVerified) {
    const { amount, purpose, transactionReference, paymentFrom, paymentTo } =
      args.payment;
    try {
      const itemsToPurchase = JSON.parse(purpose);
      const result = await updateQuantity(
        itemsToPurchase,
        context.email,
        "pre-pay-check",
        transactionReference
      );
      if (result.length > 0) {
        return result;
      } else {
        return ["Success"];
      }
    } catch (err) {
      throw new Error(err);
    }
  } else {
    throw new AuthenticationError(
      "You are not authorized to make this operation"
    );
  }
};
exports.checkPaymentEligibility = checkPaymentEligibility;

const withdrawToBankSingle = async (parent, args, context, info) => {
  if (context.validAccessToken && context.isVerified) {
    const { amount } = args;
    try {
      const email = context.email;
      const user = await User.findOne({ email });

      const result = await singlePayout(
        user.bankAccountNumber,
        user.bankCode,
        amount
      );
      if (result) {
        const account = await Account.findOneAndUpdate(
          { userEmail: email },
          {
            currentBalance: 0,
          },
          { new: true }
        );
        if (account) {
          return result;
        } else {
          throw new Error("Could not update Account");
        }
      } else {
        throw new Error("Could not process single payment request");
      }
    } catch (err) {
      throw new Error(err);
    }
  } else {
    throw new AuthenticationError(
      "You are not authorized to make this operation"
    );
  }
};
exports.withdrawToBankSingle = withdrawToBankSingle;

const withdrawToBankBulk = async (parent, args, context, info) => {
  if (
    context.validAccessToken &&
    context.isVerified &&
    context.userStatus === "admin"
  ) {
    try {
      const result = await bulkPayout();
      if (result) {
        await Outpayment.deleteMany({ isCompleteTransaction: true });
        return result;
      }
    } catch (err) {
      throw new Error(err);
    }
  } else {
    throw new AuthenticationError(
      "You are not authorized to make this operation"
    );
  }
};
exports.withdrawToBankBulk = withdrawToBankBulk;

const makePayment = async (parent, args, context, info) => {
  if (context.validAccessToken && context.isVerified) {
    const { amount, purpose, transactionReference, paymentFrom, paymentTo } =
      args.payment;
    try {
      const payment = new Payment({
        amount: amount / 100,
        purpose,
        transactionReference,
        paymentFrom,
        paymentTo,
      });
      await payment.save();
      return payment;
    } catch (err) {
      throw new Error(err);
    }
  } else {
    throw new AuthenticationError(
      "You are not authorized to make this operation"
    );
  }
};
exports.makePayment = makePayment;

const completePayment = async (parent, args, context, info) => {
  const { id, transactionReference } = args;
  try {
    if (context.validAccessToken && context.isVerified) {
      const incompletePayment = await Payment.findOne({
        id,
        transactionReference,
      });
      if (incompletePayment) {
        const transactionDetails = JSON.parse(incompletePayment.purpose);

        const commission = await Commission.find({});
        const commissionRate = commission[0].regularRate;
        const transactionPromise = await paystack.verifyTransaction({
          reference: transactionReference,
        });

        const status = transactionPromise.body.data.status;
        const verifiedTransxnAmount = transactionPromise.body.data.amount / 100;
        const unverifiedTransxnAmount = incompletePayment.amount;
        const paystackTransactionFee = transactionPromise.body.data.fees / 100;

        const finalAmount =
          ((100 - commissionRate) / 100) *
          (unverifiedTransxnAmount - paystackTransactionFee);

        const percentageAmount = finalAmount / verifiedTransxnAmount;

        if (
          status === "success" &&
          verifiedTransxnAmount === unverifiedTransxnAmount
        ) {
          const result = await updateQuantity(
            transactionDetails,
            context.email,
            "complete-transaction",
            transactionReference,
            id,
            percentageAmount
          );
          const payment = await Payment.findByIdAndUpdate(
            id,
            {
              paystackTransactionFee,
              finalAmount,
              isCompleteTransaction: true,
            },
            { new: true }
          );
          return payment;
        } else {
          throw new Error(
            "Something went wrong with your transaction, please contact Admin"
          );
        }
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
exports.completePayment = completePayment;

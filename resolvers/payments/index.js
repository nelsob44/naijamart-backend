const Payment = require("../../models/Payment.model");
const User = require("../../models/User.model");
const Product = require("../../models/Product.model");
const { updateQuantity } = require("../../utilities/quantity-update");

const checkPaymentEligibility = async (parent, args, context, info) => {
  if (context.validAccessToken && context.isVerified) {
    const { amount, purpose, transactionReference, paymentFrom, paymentTo } =
      args.payment;
    try {
      const itemsToPurchase = JSON.parse(purpose);
      const result = await updateQuantity(
        itemsToPurchase,
        context.email,
        "pre-pay-check"
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

const makePayment = async (parent, args, context, info) => {
  if (context.validAccessToken && context.isVerified) {
    const { amount, purpose, transactionReference, paymentFrom, paymentTo } =
      args.payment;
    try {
      const payment = new Payment({
        amount,
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
        const result = await updateQuantity(
          transactionDetails,
          context.email,
          "complete-transaction",
          id
        );
        console.log({ result });
        const payment = await Payment.findByIdAndUpdate(
          id,
          {
            isCompleteTransaction: true,
          },
          { new: true }
        );
        return payment;
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

const Order = require("../../models/Order.model");
const Outpayment = require("../../models/Outpayment.model");
const Payment = require("../../models/Payment.model");
const User = require("../../models/User.model");

const getMyOrders = async (parent, args, context, info) => {
  const { offset, limit } = args.myOrderQuery;
  if (context.validAccessToken && context.isVerified) {
    const email = context.email;
    try {
      const totalItems = await Order.find({
        $or: [{ buyerEmail: email }, { sellerEmail: email }],
      }).countDocuments();
      const result = await Order.find({
        $or: [{ buyerEmail: email }, { sellerEmail: email }],
      })
        .sort({ createdAt: -1 })
        .skip(((offset || 1) - 1) * (limit || 3))
        .limit(limit || 3);
      const orders = {
        order: result,
        totalItems: totalItems,
      };
      return orders;
    } catch (err) {
      throw new Error(err);
    }
  } else {
    throw new Error("You are not authorised to make this operation");
  }
};

exports.getMyOrders = getMyOrders;

const releaseFunds = async (parent, args, context, info) => {
  const { orderId, transactionReference } = args;
  if (context.validAccessToken && context.isVerified) {
    const email = context.email;
    try {
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: orderId },
        {
          isDispatched: true,
          isCompleteTransaction: true,
        },
        { new: true }
      );
      const updatedPayment = await Payment.findOneAndUpdate(
        { transactionReference },
        {
          isCompleteTransaction: true,
        },
        { new: true }
      );
      const user = await User.findOne({ email: updatedOrder.sellerEmail });
      const outPayment = new Outpayment({
        amount: updatedOrder.finalAmount,
        recepientName: updatedOrder.sellerName,
        recepientEmail: updatedOrder.sellerEmail,
        bankName: user.bankName,
        bankAccountNumber: user.bankAccountNumber,
        transactionReference: updatedOrder.transactionReference,
      });
      const result = await outPayment.save();

      return result;
    } catch (err) {
      throw new Error(err);
    }
  } else {
    throw new Error("You are not authorised to make this operation");
  }
};

exports.releaseFunds = releaseFunds;

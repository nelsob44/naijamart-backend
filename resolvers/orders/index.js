const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const Order = require("../../models/Order.model");
const Outpayment = require("../../models/Outpayment.model");
const Payment = require("../../models/Payment.model");
const User = require("../../models/User.model");
const Commission = require("../../models/Commission.model");
const { sendEmail } = require("../../utilities/email");

const emailTemplateSourceNotifybuyer = fs.readFileSync(
  path.join(__dirname, "../../views", "notifybuyer.html"),
  "utf8"
);
const templateNotifybuyer = handlebars.compile(emailTemplateSourceNotifybuyer);

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

const getOrder = async (parent, args, context, info) => {
  const { orderId } = args;
  if (
    context.validAccessToken &&
    context.isVerified &&
    context.userStatus === "admin"
  ) {
    const email = context.email;
    try {
      const order = await Order.findById(orderId);
      return order;
    } catch (err) {
      throw new Error(err);
    }
  } else {
    throw new Error("You are not authorised to make this operation");
  }
};

exports.getOrder = getOrder;

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

const sendBuyerNotification = async (parent, args, context, info) => {
  if (context.validAccessToken && context.isVerified) {
    const {
      orderId,
      transactionReference,
      buyerName,
      buyerEmail,
      itemName,
      itemQuantity,
      sellerName,
    } = args.notification;
    try {
      const htmlToSend = templateNotifybuyer({
        orderId,
        transactionReference,
        buyerName,
        itemName,
        itemQuantity,
        sellerName,
      });
      const messageData = {
        from: "Malamino <admin@malamino.com>",
        to: buyerEmail,
        subject: `Your Order ${orderId} has been dispatched`,
        html: htmlToSend,
      };
      sendEmail(messageData);
      return "Notification sent!";
    } catch (err) {
      throw new Error(err);
    }
  } else {
    throw new AuthenticationError(
      "You are not authorized to make this operation"
    );
  }
};
exports.sendBuyerNotification = sendBuyerNotification;

const updateRegularCommission = async (parent, args, context, info) => {
  const { percentage } = args;
  if (
    context.validAccessToken &&
    context.isVerified &&
    context.userStatus === "admin"
  ) {
    const email = context.email;
    try {
      const regCommission = await Commission.find({});
      const regCommissionRate = regCommission[0].regularRate;
      const updatedCommission = await Commission.updateOne(
        {
          regularRate: regCommissionRate,
        },
        {
          regularRate: percentage,
          lastUpdatedBy: email,
        }
      );
      return "Regular Commission successfully updated";
    } catch (err) {
      throw new Error(" You are not authorised to make this operation" + err);
    }
  } else {
    throw new Error("You are not authorised to make this operation");
  }
};
exports.updateRegularCommission = updateRegularCommission;

const updatePremiumCommission = async (parent, args, context, info) => {
  const { percentage } = args;
  if (
    context.validAccessToken &&
    context.isVerified &&
    context.userStatus === "admin"
  ) {
    const email = context.email;
    try {
      const premCommission = await Commission.find({});
      const premCommissionRate = premCommission[0].premiumRate;
      const updatedCommission = await Commission.updateOne(
        {
          premiumRate: premCommissionRate,
        },
        {
          premiumRate: percentage,
          lastUpdatedBy: email,
        }
      );
      return "Regular Commission successfully updated";
    } catch (err) {
      throw new Error(" You are not authorised to make this operation" + err);
    }
  } else {
    throw new Error("You are not authorised to make this operation");
  }
};
exports.updatePremiumCommission = updatePremiumCommission;

const getCommissions = async (parent, args, context, info) => {
  const status = context.userStatus;
  if (context.validAccessToken && context.isVerified && status === "admin") {
    try {
      const commissionArray = await Commission.find({});
      const commission = commissionArray[0];
      return commission;
    } catch (err) {
      throw new Error(" You are not authorised to make this operation" + err);
    }
  } else {
    throw new Error("You are not authorised to make this operation");
  }
};
exports.getCommissions = getCommissions;

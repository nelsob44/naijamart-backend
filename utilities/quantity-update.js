const Product = require("../models/Product.model");
const User = require("../models/User.model");
const Order = require("../models/Order.model");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
const { sendEmail } = require("./email");
const emailTemplateSourceCaution = fs.readFileSync(
  path.join(__dirname, "../views", "caution.html"),
  "utf8"
);
const templateCaution = handlebars.compile(emailTemplateSourceCaution);

const emailTemplateSourceInvoice = fs.readFileSync(
  path.join(__dirname, "../views", "invoice.html"),
  "utf8"
);
const templateInvoice = handlebars.compile(emailTemplateSourceInvoice);

async function updateQuantity(
  itemsToPurchase,
  buyerEmail,
  operator,
  transactionReference,
  paymentId = null,
  percentageAmount = null
) {
  const errors = [];
  for (let i = 0; i < itemsToPurchase.length; i++) {
    try {
      let oldProduct = await Product.findById(itemsToPurchase[i].id);
      let sellerEmail = oldProduct.sellerEmail;
      const seller = await User.findOne({ sellerEmail });
      const buyer = await User.findOne({ buyerEmail });

      switch (operator) {
        case "pre-pay-check":
          if (oldProduct.availableQuantity - itemsToPurchase[i].quantity < 0) {
            errors.push(
              `You have selected more quantity of ${oldProduct.title} than is currently available. Please reduce quantity`
            );
          }
          break;
        case "minus":
          if (oldProduct.availableQuantity - itemsToPurchase[i].quantity < 0) {
            errors.push(
              `You have selected more quantity of ${oldProduct.title} than is currently available. Please reduce quantity`
            );
            // const seller = await User.findOne({ sellerEmail });
            // const buyer = await User.findOne({ buyerEmail });
            const htmlToSend = templateCaution({
              sellerName: seller.firstName,
              buyerName: buyer.firstName + " " + buyer.lastName,
              buyerEmail,
              quantityError: itemsToPurchase[i].quantity,
              availableQuantity: oldProduct.availableQuantity,
              itemName: oldProduct.title,
            });
            const messageData = {
              from: "Malamino <admin@malamino.com>",
              to: sellerEmail,
              cc: "info@malamino.com",
              subject: "Stock Quantity Error",
              html: htmlToSend,
            };
            sendEmail(messageData);
          } else {
            const updated = await Product.findByIdAndUpdate(
              itemsToPurchase[i].id,
              {
                availableQuantity:
                  oldProduct.availableQuantity - itemsToPurchase[i].quantity,
              },
              { new: true }
            );
          }
          break;
        case "add":
          const updated = await Product.findByIdAndUpdate(
            itemsToPurchase[i].id,
            {
              availableQuantity:
                oldProduct.availableQuantity + itemsToPurchase[i].quantity,
            },
            { new: true }
          );
          break;
        case "complete-transaction":
          if (oldProduct.availableQuantity - itemsToPurchase[i].quantity < 0) {
            errors.push(
              `You have selected more quantity of ${oldProduct.title} than is currently available. Please reduce quantity`
            );
            const htmlToSend = templateCaution({
              sellerName: seller.firstName,
              buyerName: buyer.firstName + " " + buyer.lastName,
              buyerEmail,
              quantityError: itemsToPurchase[i].quantity,
              availableQuantity: oldProduct.availableQuantity,
              itemName: oldProduct.title,
            });
            const messageData = {
              from: "Malamino <admin@malamino.com>",
              to: sellerEmail,
              cc: "info@malamino.com",
              subject: "Stock Quantity Error",
              html: htmlToSend,
            };
            sendEmail(messageData);
          } else {
            const order = new Order({
              itemName: itemsToPurchase[i].title,
              unitPrice: itemsToPurchase[i].unitCost,
              itemQuantity: itemsToPurchase[i].quantity,
              amount: itemsToPurchase[i].subTotal,
              finalAmount: Math.floor(
                itemsToPurchase[i].subTotal * percentageAmount
              ),
              transactionReference,
              buyerEmail,
              sellerEmail,
              buyerName: buyer.firstName + " " + buyer.lastName,
              sellerName: seller.firstName + " " + seller.lastName,
              isPaidFor: true,
              shippingDetails: "not yet dispatched",
            });
            await order.save();

            const updated = await Product.findByIdAndUpdate(
              itemsToPurchase[i].id,
              {
                availableQuantity:
                  oldProduct.availableQuantity - itemsToPurchase[i].quantity,
              },
              { new: true }
            );
            //console.log(`item ${i} is`, itemsToPurchase[i]);
            const htmlToSendSeller = templateInvoice({
              sellerName: seller.firstName,
              name: seller.firstName,
              isBuyer: false,
              sellerId: seller.id,
              buyerName: buyer.firstName + " " + buyer.lastName,
              buyerEmail,
              quantityPurchased: itemsToPurchase[i].quantity,
              amountPaid: itemsToPurchase[i].subTotal,
              itemName: oldProduct.title,
              paymentId,
              deliveryAddress:
                buyer.address + ", " + buyer.city + ", " + buyer.country,
            });

            const htmlToSendBuyer = templateInvoice({
              sellerName: seller.firstName,
              name: buyer.firstName,
              isBuyer: true,
              buyerId: buyer.id,
              buyerName: buyer.firstName + " " + buyer.lastName,
              buyerEmail,
              quantityPurchased: itemsToPurchase[i].quantity,
              amountPaid: itemsToPurchase[i].subTotal,
              itemName: oldProduct.title,
              paymentId,
              deliveryAddress:
                buyer.address + ", " + buyer.city + ", " + buyer.country,
            });
            const messageDataSeller = {
              from: "Malamino <admin@malamino.com>",
              to: sellerEmail,
              cc: "info@malamino.com",
              subject: "Order payment - " + paymentId,
              html: htmlToSendSeller,
            };

            const messageDataBuyer = {
              from: "Malamino <admin@malamino.com>",
              to: buyerEmail,
              cc: "info@malamino.com",
              subject: "Your Order confirmation - " + paymentId,
              html: htmlToSendBuyer,
            };
            sendEmail(messageDataSeller);
            sendEmail(messageDataBuyer);
          }
          break;
        default:
      }

      //   if (operator === "minus") {
      //     if (oldProduct.availableQuantity - itemsToPurchase[i].quantity < 0) {
      //       console.log("unavailable quantity", itemsToPurchase[i].title);
      //       errors.push(
      //         `You have selected more quantity of ${oldProduct.title} than is currently available. Please reduce quantity`
      //       );
      //     } else {
      //       console.log("available quantity", itemsToPurchase[i].title);
      //       const updated = await Product.findByIdAndUpdate(
      //         itemsToPurchase[i].id,
      //         {
      //           availableQuantity:
      //             oldProduct.availableQuantity - itemsToPurchase[i].quantity,
      //         },
      //         { new: true }
      //       );
      //     }
      //   } else {
      //     const updated = await Product.findByIdAndUpdate(
      //       itemsToPurchase[i].id,
      //       {
      //         availableQuantity:
      //           oldProduct.availableQuantity + itemsToPurchase[i].quantity,
      //       },
      //       { new: true }
      //     );
      //   }
    } catch (error) {
      throw new Error(error);
    }
  }
  return errors;
}

exports.updateQuantity = updateQuantity;

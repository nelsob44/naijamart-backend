const User = require("../../models/User.model");
const Product = require("../../models/Product.model");
const { AuthenticationError } = require("apollo-server-errors");
const { deleteObjects } = require("../../s3");

const imagesCarousel = [];

function transformImagePath(productImages) {
  productImages.map((img) => {
    const newImg = img.split(",");

    imagesCarousel.push(newImg[0]);
  });
}

const getMyProducts = async (parent, args, _context, info) => {
  const { offset, limit } = args.myproductQuery;
  if (_context.validAccessToken) {
    const sellerEmail = _context.email;
    try {
      const totalItems = await Product.find({
        sellerEmail,
      }).countDocuments();
      const result = await Product.find({ sellerEmail })
        .sort({ createdAt: -1 })
        .skip(((offset || 1) - 1) * (limit || 3))
        .limit(limit || 3);
      const products = {
        product: result,
        totalItems: totalItems,
      };
      return products;
    } catch (err) {
      throw new Error(err);
    }
  } else {
    throw new Error("You are not authorised to make this operation");
  }
};

exports.getMyProducts = getMyProducts;

const getAvailableProducts = async (parent, args, _context, info) => {
  const { offset, limit } = args.pagination;
  try {
    const totalItems = await Product.find({
      availableQuantity: { $gte: 1 },
    }).countDocuments();
    const result = await Product.find({ availableQuantity: { $gte: 1 } })
      .sort({ createdAt: -1 })
      .skip(((offset || 1) - 1) * (limit || 3))
      .limit(limit || 3);
    const products = {
      product: result,
      totalItems: totalItems,
    };
    return products;
  } catch (err) {
    throw new Error(err);
  }
};
exports.getAvailableProducts = getAvailableProducts;

const addProduct = async (parent, args, context, info) => {
  console.log("got here now validAccessToken ", context?.validAccessToken);
  if (context.validAccessToken && context.isVerified) {
    const {
      category,
      description,
      price,
      title,
      minOrder,
      sellerCountry,
      sellerLocation,
      furtherDetails,
      availableQuantity,
      discount,
      promoStartDate,
      promoEndDate,
      videoLink,
      images,
    } = args.product;
    const newcategory = category && category.replace(/(<([^>]+)>)/gi, "");
    const newdescription =
      description && description.replace(/(<([^>]+)>)/gi, "");
    const newtitle = title && title.replace(/(<([^>]+)>)/gi, "");
    const newsellerCountry =
      sellerCountry && sellerCountry.replace(/(<([^>]+)>)/gi, "");
    const newsellerLocation =
      sellerLocation && sellerLocation.replace(/(<([^>]+)>)/gi, "");
    const newfurtherDetails =
      furtherDetails && furtherDetails.replace(/(<([^>]+)>)/gi, "");
    const newpromoStartDate =
      promoStartDate && promoStartDate.replace(/(<([^>]+)>)/gi, "");
    const newpromoEndDate =
      promoEndDate && promoEndDate.replace(/(<([^>]+)>)/gi, "");
    const newvideoLink = videoLink.replace(/(<([^>]+)>)/gi, "");
    try {
      const product = new Product({
        category: newcategory,
        description: newdescription,
        price,
        title: newtitle,
        minOrder,
        sellerCountry: newsellerCountry,
        sellerLocation: newsellerLocation,
        sellerEmail: context.email,
        furtherDetails: newfurtherDetails,
        availableQuantity,
        discount,
        promoStartDate: newpromoStartDate,
        promoEndDate: newpromoEndDate,
        videoLink: newvideoLink,
        images,
      });
      await product.save();
      return product;
    } catch (err) {
      throw new Error(err);
    }
  } else {
    throw new AuthenticationError(
      "You are not authorized to make this operation"
    );
  }
};

exports.addProduct = addProduct;

const updateProduct = async (parent, args, context, info) => {
  const {
    id,
    category,
    description,
    price,
    title,
    minOrder,
    sellerCountry,
    sellerLocation,
    sellerEmail,
    furtherDetails,
    availableQuantity,
    discount,
    promoStartDate,
    promoEndDate,
    videoLink,
    images,
  } = args.product;
  try {
    if (context.validAccessToken && context.isVerified) {
      const newcategory = category && category.replace(/(<([^>]+)>)/gi, "");
      const newdescription =
        description && description.replace(/(<([^>]+)>)/gi, "");
      const newtitle = title && title.replace(/(<([^>]+)>)/gi, "");
      const newsellerCountry =
        sellerCountry && sellerCountry.replace(/(<([^>]+)>)/gi, "");
      const newsellerLocation =
        sellerLocation && sellerLocation.replace(/(<([^>]+)>)/gi, "");
      const newfurtherDetails =
        furtherDetails && furtherDetails.replace(/(<([^>]+)>)/gi, "");
      const newpromoStartDate =
        promoStartDate && promoStartDate.replace(/(<([^>]+)>)/gi, "");
      const newpromoEndDate =
        promoEndDate && promoEndDate.replace(/(<([^>]+)>)/gi, "");
      const newvideoLinkString =
        videoLink && videoLink.replace(/(<([^>]+)>)/gi, "");
      let newImages = [];
      let newVideoLink = "";
      const oldProduct = await Product.findById(id);
      const oldImages = oldProduct.images;
      const oldVideoLink = oldProduct.videoLink;
      if (newvideoLinkString !== "" && newvideoLinkString !== null) {
        newVideoLink = newvideoLinkString;
      } else {
        newVideoLink = oldVideoLink;
      }
      newImages = oldImages.concat(images);
      if (
        oldProduct.sellerEmail === context.email ||
        context.userStatus === "admin"
      ) {
        const product = await Product.findByIdAndUpdate(
          id,
          {
            category: newcategory,
            description: newdescription,
            price,
            title: newtitle,
            minOrder,
            sellerCountry: newsellerCountry,
            sellerLocation: newsellerLocation,
            sellerEmail,
            furtherDetails: newfurtherDetails,
            availableQuantity,
            discount,
            promoStartDate: newpromoStartDate,
            promoEndDate: newpromoEndDate,
            videoLink: newVideoLink,
            images: newImages,
          },
          { new: true }
        );
        return product;
      } else {
        throw new Error("You are not authorized to make this operation");
      }
    } else {
      throw new Error("You are not authorized to make this operation");
    }
  } catch (error) {
    throw new Error(error);
  }
};
exports.updateProduct = updateProduct;

const deleteProduct = async (parent, args, context, info) => {
  const { id } = args;
  if (context.validAccessToken && context.isVerified) {
    try {
      const product = await Product.findById(id);
      if (
        product.sellerEmail === context.email ||
        context.userStatus === "admin"
      ) {
        await transformImagePath(product.images);
        const delResults = await deleteObjects(imagesCarousel);
        if (delResults.result.Errors.length === 0) {
          await Product.findByIdAndDelete(id);
          return "Product was successfully deleted";
        }
      } else {
        throw new Error("You are not authorized to make this operation");
      }
    } catch (err) {
      throw new Error(err);
    }
  } else {
    throw new Error("You are not authorized to make this operation");
  }
};
exports.deleteProduct = deleteProduct;

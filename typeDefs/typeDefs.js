const { gql } = require("apollo-server-express");

const typeDefs = gql`
  scalar Upload

  type User {
    id: ID
    firstName: String
    lastName: String
    email: String
    password: String
    phoneNumber: String
    country: String
    city: String
    address: String
    isVerified: Boolean
  }

  type Product {
    id: ID
    category: String
    description: String
    images: [String]
    price: Float!
    title: String!
    minOrder: Float
    sellerLocation: String
    sellerEmail: String
    verifiedSeller: Boolean
    furtherDetails: String
    availableQuantity: Int
    discount: Float
    reviews: Float
    promoEndDate: String
    promoStartDate: String
  }

  type ProductPaginate {
    product: [Product]
    totalItems: Int
  }

  type Token {
    accessToken: String!
    email: String!
    firstName: String!
    userId: String!
    privilege: String!
  }

  type File {
    filename: String!
    mimetype: String!
    encoding: String!
  }

  input PaginationInput {
    offset: Int
    limit: Int
  }

  input PaginationInputQuery {
    offset: Int
    limit: Int
    sellerEmail: String
  }

  input ProductInput {
    category: String!
    description: String!
    price: Float!
    title: String!
    minOrder: Float
    sellerLocation: String
    sellerEmail: String
    furtherDetails: String
    availableQuantity: Int
    discount: Float
    promoStartDate: String
    promoEndDate: String
    images: [String]
  }

  input UpdateProductInput {
    id: ID!
    category: String
    description: String
    price: Float
    title: String
    minOrder: Float
    sellerLocation: String
    sellerEmail: String
    furtherDetails: String
    availableQuantity: Int
    discount: Float
    promoStartDate: String
    promoEndDate: String
    images: [String]
  }

  input UserInput {
    firstName: String!
    lastName: String!
    email: String!
    password: String!
    phoneNumber: String
    country: String
    city: String
    address: String
  }

  input AuthInput {
    email: String!
    password: String!
  }

  type Query {
    getMyProducts(myproductQuery: PaginationInputQuery): ProductPaginate
    getAvailableProducts(pagination: PaginationInput): ProductPaginate
    getUser(id: ID): User
  }

  type Mutation {
    createUser(user: UserInput): User
    deleteUser(id: ID): String
    updateUser(id: ID, user: UserInput): User

    updateProduct(product: UpdateProductInput): Product

    authenticateUser(user: AuthInput): Token
    refresh: String
    addProduct(product: ProductInput): Product
    deleteProduct(id: ID): String
  }
`;

module.exports = typeDefs;

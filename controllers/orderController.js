const Order = require('../models/Order')
const Product = require('../models/Product')

const { StatusCodes } = require('http-status-codes')
const CustomError = require('../errors')
const { checkPermissions } = require('../utils')

const getAllOrders = async (req, res) => {
  const orders = await Order.find({})
  res.status(StatusCodes.OK).json({ orders, count: orders.length })
}

const getSingleOrder = async (req, res) => {
  const { id: orderId } = req.params
  const order = await Order.findOne({ _id: orderId })
  if (!order) {
    throw new CustomError.NotFoundError(`Order with id ${orderId} not found`)
  }
  checkPermissions(req.user, order.user)
  res.status(StatusCodes.OK).json({ order })
}

const getCurrentUserOrders = async (req, res) => {
  const { userId } = req.user
  const userOrders = await Order.find({ user: userId })
  if (!userOrders?.length) {
    throw new CustomError.NotFoundError('User has no orders')
  }
  res.status(StatusCodes.OK).json({ userOrders, count: userOrders.length })
}

const fakeStripeApi = async ({ amount, currency }) => {
  const client_secret = 'someRandomValue'
  return {
    client_secret,
    amount,
  }
}

const createOrder = async (req, res) => {
  const { items: cartItems, tax, shippingFee } = req.body
  if (!cartItems?.length) {
    throw new CustomError.BadRequestError('Cart is empty')
  }
  if (!tax || !shippingFee) {
    throw new CustomError.BadRequestError('Tax and shipping fee are required')
  }

  const orderItems = []
  let subtotal = 0

  for (const item of cartItems) {
    const dbProduct = await Product.findOne({ _id: item.product })
    if (!dbProduct) {
      throw new CustomError.NotFoundError(
        `Product with id ${item.product} not found`
      )
    }
    const { name, price, image, _id } = dbProduct
    const singleOrderItem = {
      amount: item.amount,
      name,
      price,
      image,
      product: _id,
    }
    orderItems.push(singleOrderItem)
    subtotal += item.amount * price
  }
  const total = tax + shippingFee + subtotal

  const paymentIntent = await fakeStripeApi({
    amount: total,
    currency: 'pln',
  })

  const order = await Order.create({
    orderItems,
    total,
    subtotal,
    tax,
    shippingFee,
    clientSecret: paymentIntent.client_secret,
    user: req.user.userId,
  })

  res
    .status(StatusCodes.CREATED)
    .json({ order, clientSecret: order.clientSecret })
}

const updateOrder = async (req, res) => {
  const { id: orderId } = req.params
  const { paymentIntentId } = req.body
  const order = await Order.findOne({ _id: orderId })
  if (!order) {
    throw new CustomError.NotFoundError(`Order with id ${orderId} not found`)
  }
  checkPermissions(req.user, order.user)

  order.paymentIntentId = paymentIntentId
  order.status = 'paid'
  await order.save()

  res.status(StatusCodes.OK).json({ order })
}

module.exports = {
  getAllOrders,
  getSingleOrder,
  getCurrentUserOrders,
  createOrder,
  updateOrder,
}

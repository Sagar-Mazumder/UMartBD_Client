const express = require('express')
const { MongoClient } = require('mongodb');
const app = express()
const cors = require('cors')
const SSLCommerzPayment = require('sslcommerz')

require('dotenv').config()
const port = process.env.PORT || 5000

// firebase authorization 
var admin = require("firebase-admin");

var serviceAccount = require('./ema-jhon-server-5bf6e-firebase-adminsdk-n2wq2-f6a5bda937.json');

admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
});

app.use(cors())
app.use(express.json())
//sslcommerz init
app.get('/init/:amount', (req, res) => {
      const data = {
            total_amount: req.params.amount,
            currency: 'BDT',
            tran_id: 'REF123',
            success_url: 'http://localhost:5000/success',
            fail_url: 'http://localhost:5000/fail',
            cancel_url: 'http://localhost:5000/cancel',
            ipn_url: 'http://localhost:5000/ipn',
            shipping_method: 'Courier',
            product_name: 'Computer.',
            product_category: 'Electronic',
            product_profile: 'general',
            cus_name: 'Customer Name',
            cus_email: 'cust@yahoo.com',
            cus_add1: 'Dhaka',
            cus_add2: 'Dhaka',
            cus_city: 'Dhaka',
            cus_state: 'Dhaka',
            cus_postcode: '1000',
            cus_country: 'Bangladesh',
            cus_phone: '01711111111',
            cus_fax: '01711111111',
            ship_name: 'Customer Name',
            ship_add1: 'Dhaka',
            ship_add2: 'Dhaka',
            ship_city: 'Dhaka',
            ship_state: 'Dhaka',
            ship_postcode: 1000,
            ship_country: 'Bangladesh',
            multi_card_name: 'mastercard',
            value_a: 'ref001_A',
            value_b: 'ref002_B',
            value_c: 'ref003_C',
            value_d: 'ref004_D'
      };
      const sslcommer = new SSLCommerzPayment('testbox', 'qwerty', false) //true for live default false for sandbox
      sslcommer.init(data).then(data => {
            //process the response that got from sslcommerz 
            //https://developer.sslcommerz.com/doc/v4/#returned-parameters
            // console.log(data)
            res.redirect(data.GatewayPageURL)
      });
})

app.post("/success", async (req, res) => {

      console.log(req.body)
      res.status(200).json(req.body)

})
app.post("/fail", async (req, res) => {

      console.log(req.body)
      res.status(400).json(req.body)

})
app.post("/cancel", async (req, res) => {

      console.log(req.body)
      res.status(200).json(req.body)

})
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iymhd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
// console.log(uri)
async function verifyToken(req, res, next) {
      if (req.headers?.authorization?.startsWith('Bearer ')) {
            const idToken = req.headers.authorization.split('Bearer ')[1]
            // console.log(idToken)
            try {
                  const decodedUser = await admin.auth().verifyIdToken(idToken);
                  // console.log('email', decodedUser.email);
                  req.decodedUserEmail = decodedUser.email;
            }
            catch {

            }
      }
      next();
}
async function run() {
      try {
            await client.connect();
            // console.log('database connected')
            const database = client.db('online_shop');
            const productsCollection = database.collection('products');
            const orderCollection = database.collection('orders')


            // get products 
            app.get('/products', async (req, res) => {
                  // console.log(req.query)
                  const page = req.query.page
                  const size = parseInt(req.query.size)
                  const cursor = productsCollection.find({})
                  const count = await cursor.count()
                  let products;
                  if (page) {
                        products = await cursor.skip(page * size).limit(size).toArray()
                  }
                  else {
                        products = await cursor.toArray();
                  }
                  res.send({
                        count,
                        products
                  })
            })
            app.post('/products/bykeys', async (req, res) => {
                  const keys = req.body;
                  const query = { key: { $in: keys } }
                  const products = await productsCollection.find(query).toArray()
                  // console.log(req.body)
                  res.json(products)
            })

            // getting all orders 
            app.get('/orders', verifyToken, async (req, res) => {

                  const email = req.query.email
                  if (req.decodedUserEmail === email) {
                        query = { email: email }
                        const cursor = orderCollection.find(query)
                        const result = await cursor.toArray()
                        res.send(result)
                  }
                  else {
                        res.status(401).json({ message: 'user not authorized' })
                  }



            })

            //order collection

            app.post('/orders', async (req, res) => {
                  const order = req.body;
                  // console.log('order', order)
                  order.createdTime = new Date;
                  const result = await orderCollection.insertOne(order)
                  res.json(result)
            })


      }
      finally {
            // await client.close();
      }
}
run().catch(console.dir)
app.get('/', (req, res) => {
      res.send('Firebase initialization')
})
app.listen(port, () => {
      console.log('running at the server address', port)
})
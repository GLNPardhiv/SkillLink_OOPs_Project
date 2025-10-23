import dotenv from "dotenv"
import app from "./app.js"
import connectDB from "./db/index.js"

//load .env variables to node.js application
dotenv.config({
    path:"../.env", //specifies .env location
});

const port = process.env.PORT || 3000;
console.log(process.env.MONGO_URI); // Should print your URL

//starts express server after connecting to mongodb
connectDB()
    .then(() => {
        app.listen(port, () => { //starts express server
            console.log(`listening on port : http://localhost:${port}`);
            console.log("../backend/src/index.js");
        });
    })
    .catch((err) => {
        console.error("MongoDB connection error, err")
        console.log("../backend/src/index.js");
        process.exit(1);
    })
import express from "express"
import cors from "cors"
import connectToDatabase from "./database/connection.js"
import testRoutes from "./routes/testRoutes.js"
import bodyParser from 'body-parser';
import simulationRoutes from './routes/simulationRoutes.js'

// connectToDatabase()
const app = express()
const port = process.env.PORT || 5002

app.use(bodyParser.json()); 
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Working Fine')
})

app.use('/test', testRoutes)

app.use('/api',simulationRoutes)

app.listen(port, () => {
    console.log(`App listening at PORT:${port} and live at http://localhost:${port}`)
})
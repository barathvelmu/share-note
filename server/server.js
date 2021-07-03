const mongoose = require("mongoose");
const Document = require("./Document")


mongoose.connect("mongodb://localhost/sharenote", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
})

const io = require('socket.io')(3001, { //3001 is the server port
    cors: { 
        origin: 'http://localhost:3000', //client
        methods: ['GET', 'POST'], // http methods to allow, socket.io  allows for these 2 only
    }
})


const defaultValue = "" 


io.on("connection", socket => {
    // For given documentId:
    socket.on("get-document", async documentId => {
        const document = await findOrCreateDocument(documentId) //DB (refer helper function)
        socket.join(documentId) //isolating into "own" room
        socket.emit("load-document", document.data)

        socket.on("send-changes", delta => {
            socket.broadcast.to(documentId).emit("receive-changes", delta) // "to(documentId)" emits to the specific "room"
        })

        socket.on("save-document", async data => {
            await Document.findByIdAndUpdate(documentId, { data })
        })
    })
})


// ============================================= 
// DB - Persisting Documents:

async function findOrCreateDocument(id) {
    if (id == null) return

    const document = await Document.findById(id) //finding a document by Id
    if (document) return document

    //if document doesnt already exist, create it
    return await Document.create({ _id: id, data: defaultValue }) //creation of a new document
}
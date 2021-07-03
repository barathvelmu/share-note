import React, { useCallback, useEffect, useState } from 'react'
import Quill from "quill"
import "quill/dist/quill.snow.css"
import { io } from 'socket.io-client'
import { useParams } from 'react-router-dom'

// Autosave Interval
const SAVE_INTERVAL_MS = 2000

// Quill Toolbar Settings
const TOOLBAR_OPTIONS = [ 
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
]


export default function TextEditor() {
    const {id: documentId} = useParams()
    const [socket, setSocket] = useState()
    const [quill, setQuill] = useState()


    // ============================================= 
    // Bidirectional Communication (Client - Server): 

    // useEffect handles socket connection and disconnection (run once)
    useEffect(() => {
        const s = io("http://localhost:3001") //server url
        setSocket(s)

        return () => {
            s.disconnect()
        }
    }, []) 


    // ============================================= 
    // Isolating Documents (creating "rooms"): 

    useEffect(() =>  {
        if (socket == null || quill == null) return

        socket.once("load-document", document => { //no need for return since "socket.once()" cleans up after running once
            quill.setContents(document)
            quill.enable()
        })

        socket.emit('get-document', documentId) //send documentId to server
    }, [socket, quill, documentId])


    // ============================================= 
    // Saving Documents: 

    useEffect(() => {
        if (socket == null || quill == null) return

        const interval = setInterval(() => {
            socket.emit("save-document", quill.getContents())
        }, SAVE_INTERVAL_MS)

        return () => {
            clearInterval(interval)
        }

    }, [socket, quill])


    // ============================================= 
    // Client Change(s) Transmission: 

    // receiving information of the changes from server (2)
    useEffect(() =>  {
        if (socket == null || quill == null) return

        const handler = (delta) => { 
            quill.updateContents(delta) //updating document with the changes
        }

        socket.on("receive-changes", handler)

        return () => {
            socket.off("receive-changes", handler)
        }
    }, [socket, quill])


    // detecting changes when Quill changes (1)
    useEffect(() =>  {
        if (socket == null || quill == null) return

        const handler = (delta, oldDelta, source) => { 
            if (source !== 'user') return // track only user changes
            socket.emit("send-changes", delta) //sending to server
        }

        quill.on("text-change", handler)

        return () => {
            quill.off("text-change", handler)
        }
    }, [socket, quill])


    // ============================================= 
    // Text Editor and Toolbar: 

    const wrapperRef = useCallback((wrapper) => { // the wrapper is the container div (so on-load)
        if (wrapper == null) return 

        wrapper.innerHTML = "" //reset, avoid multiple toolbar every change
        const editor = document.createElement("div")
        wrapper.append(editor)
        //creates the text editor
        const q = new Quill(editor, { theme: 'snow', modules: { toolbar: TOOLBAR_OPTIONS } })  
        q.disable() 
        q.setText("Loading...")
        setQuill(q)

        
    }, [])

    return (
        <div className="container" ref={wrapperRef} >         
        </div>
    )
}






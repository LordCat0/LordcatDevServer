const ws = require('ws')
const fs = require('fs')
const PORT = process.env.PORT || 3000
const server = new ws.Server({ port: PORT, host: '::' })

function saveData(key, value) {
  let data = {};
  if (fs.existsSync('localStorage.json')) {
    data = JSON.parse(fs.readFileSync('localStorage.json'));
  }
  data[key] = value;
  fs.writeFileSync('localStorage.json', JSON.stringify(data));
}

function readData(key) {
  if (!fs.existsSync('localStorage.json')) return null;
  const data = JSON.parse(fs.readFileSync('localStorage.json'));
  return data[key] || null;
}

const AdminPassword = process.env.AdminPassword
const ServerVersion = process.env.ServerVersion


server.on('connection', (socket, req) => {
    socket.ip = req.socket.remoteAddress
    console.log(socket.ip)
    socket.Username = null
    socket.send(JSON.stringify({ message: "Successfully Connected", version: ServerVersion, uptime: process.uptime() }))
    socket.on('message', (msg) => {
        try{
            const json = JSON.parse(msg)
            switch(json.method){
                case 'Login':
                    socket.Username = json.Username
                    break;
                case 'Postdata':
                    server.broadcast({ User: socket.Username, X: json.X, Y: json.Y, Dir: json.Dir })
                    break;
                //Admin commands
                case 'Shutdown':
                    if(json.AdminPassword == AdminPassword){server.shutdown(json.Reason)}
                    break;
                case 'Kick':
                    if(json.AdminPassword == AdminPassword){
                        const target = Array.from(server.clients).find((client) => client.Username == json.target && client.OPEN)
                        target.close(1003, `You have been kicked: ${json.reason}`)}
                    break;
                case 'Ban':
                    if(json.AdminPassword == AdminPassword){
                        const target = Array.from(server.clients).find((client) => client.Username == json.target && client.OPEN)
                        if(!target){break}
                        const arr = readData("BannedUsers")
                        arr.push(target.Username)
                        saveData("BannedUsers", arr)}
                        break;
                case 'Ipban':
                    if(json.AdminPassword == AdminPassword){
                        const target = Array.from(server.clients).find((client) => client.Username == json.target && client.OPEN)
                        if(!target){break}
                        const arr = readData("BannedIps")
                        arr.push(target.Username)
                        saveData("BannedIps", arr)}
                        break;
                default:
                    throw new Error(`Unexpected method: ${json.method}`)
            }
        }catch(e){
            socket.close(1001, `Error: ${e.message}`)
        }
    })

})

server.broadcast = function(json){
    const string = JSON.stringify(json)
    server.clients.forEach((client) => {
        if(client.OPEN && client.Username != null && client.Username != json.User){
            client.send(string)
        }
    })
}

server.shutdown = function(msg){
    server.clients.forEach((client) => {
        if(client.OPEN){
            client.close(1002, msg)
        }
    })
}

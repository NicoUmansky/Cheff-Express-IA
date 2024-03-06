const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const express = require("express");
const mysql = require('mysql')
var cors = require('cors');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 3000;
require('dotenv').config()
const connection = mysql.createConnection(process.env.DATABASE_URL)

const Anthropic =require('@anthropic-ai/sdk');
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_KEY, // defaults to process.env["ANTHROPIC_API_KEY"]
});
// console.log(process.env.CLAUDE_KEY)


// main("Chocotorta")

// Crear api
const app = express();
app.use(bodyParser.json());
app.use(cors());

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto: ${PORT}`);
});




app.post('/CreateUser', async (req, res) => {
  const { username, password, mail } = req.body;
  try {
    const user = await prisma.Usuario.create({
      data: {
        "username": username,
        "password": password,
        "mail": mail
      } // Pasamos los datos del usuario
    });
    res.json(user);
  } catch (error) {
    console.error('Error al crear el usuario:', error);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
});

app.post('/loginValidation', async (req, res) => {
  const { username, password } = req.body;
  const userLog = await prisma.Usuario.findFirst({
    where: {
      "username": username,
      "password": password
    }
  });
  if (userLog) {
    res.json(userLog);
  }
  else {
    res.json(null);
  }
});

app.post('/PublicarReceta', async (req, res) => {
  const { nombrereceta, ingredientes, pasoapaso, sabor, IDusuario} = req.body;
  const creacion = await prisma.recetas.create({
    data: {
      nombrereceta: nombrereceta,
      ingredientes: ingredientes,
      pasoapaso: pasoapaso,
      sabor: sabor,
      IDusuario: IDusuario 
    }
  });
  if (creacion) {
    res.json(creacion);
  }
  else {
    res.status(404).send("No se publico correctamente la receta");
  }
});

app.post('/CompleteRecipe', async (req, res) => {
  const { plato } = req.body;
  
  async function main(name) {

    
    const nameReceta = name
    const msg = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 500,
      temperature: 0,
      system: "You are a famous chef from Argentina, you have a great knowledge about everything related to the kitchen and any food. You have a master in cakeshop and bakery. You will receive the name of a recipe it could be either in english or in spanish and then you will respond only and just only with the instructions step by step",
      messages: [
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": nameReceta
            }
          ]
        }
      ]
    });
    // console.log(msg.content[0].text)
    return msg.content[0].text;
  }
  res.json(await main(plato))
      
});
app.post('/SearchRecetas', async (req,res)=>{
  const { palabra } = req.body;
  const recetas = await prisma.recetas.findMany({
    where: {
      OR: [
        {
          nombrereceta: {
            contains: palabra,
            mode: 'insensitive', // Hacer la búsqueda insensible a mayúsculas y minúsculas

          },
        },
        {
          ingredientes: {
            contains: palabra,
            mode: 'insensitive', // Hacer la búsqueda insensible a mayúsculas y minúsculas

          },
        },
        {
          pasoapaso: {
            contains: palabra,
            mode: 'insensitive', // Hacer la búsqueda insensible a mayúsculas y minúsculas

          },
        },
        {
          sabor: {
            contains: palabra,
            mode: 'insensitive', // Hacer la búsqueda insensible a mayúsculas y minúsculas

          },
        },
      ],
    },
  });

  if (recetas.length > 0) {
    res.json(recetas);
  } else {
    console.log("No se encontraron recetas");
    res.json(null);
  }
});


app.post('/GetRecetasUser', async (req, res) => {
  const { IDusuario } = req.body;
  const recetasUser = await prisma.recetas.findMany({
    where: {
      IDusuario: IDusuario,
    }
  });
  if (recetasUser) {
    res.json(recetasUser);
  }
  else {
    res.json(null);
  }
}); 

// Sirve para el @dueño de la receta
app.post('/GetUserByID',async (req, res) =>{
  const { IDusuario } = req.body
  const busqueda = await prisma.Usuario.findUnique({
    where: {
      ID: IDusuario
    }
  });
  if (busqueda) {
    res.json(busqueda);
  }
  else {
    res.status(404).send("No existe el usuario");
  }
} )


app.post('/DeleteReceta', async (req, res) => {
  const { id } = req.body;
  const DeleteReceta = await prisma.recetas.delete({
    where: {
      ID: id
    }
  });
  if (DeleteReceta) {
    res.json(DeleteReceta);
  }
  else {
    res.status(404).send("Error al eliminar la receta");
  }
}
);


app.post('/EditarReceta', async (req, res) => {
  const { id, nombrereceta, ingredientes, pasoapaso, sabor, IDusuario } = req.body;
  try {
    const updatedreceta = await prisma.recetas.update({
      where: {
        ID: id
      },
      data: {
        nombrereceta: nombrereceta,
        ingredientes: ingredientes,
        pasoapaso: pasoapaso,
        sabor: sabor,
        IDusuario: IDusuario
      }
    });
    res.json(updatedreceta);
  } catch (error) {
    console.error('Error al actualizar el receta:', error);
    res.status(500).json({ error: 'Error al actualizar el receta' });
  }
});
// Publica la api para que se pueda acceder
module.exports = app;

app.use(function(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS,PUT,DELETE');
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


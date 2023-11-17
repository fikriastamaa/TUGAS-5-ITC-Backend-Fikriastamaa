require('dotenv').config();
const Division = require('../model/Division');
const User = require('../model/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const key = process.env.TOKEN_SECRET_KEY;

const getAllUser = async(req, res, next)=>{
  try {
    //TUGAS NOMOR 1
    const users = await User.findAll({
      //query = select id, fullname, nim, angkatan, profilePicture, divisionId from users
      attributes: ['id', 'fullName', 'nim', 'angkatan', 'profilePicture', 'divisionId'],
      //query = model user di inner joinkan dengan model division
      include: {
        model: Division,
        //model division yang dioutputkan hanya kolom name
        attributes: ['name']
      }
    });

    res.status(200).json({
      status: "Success",
      message: "Successfully fetch all user data",
      users: users
    })
  } catch (error) {
    console.log(error.message);
  }
}

const getUserById = (req,res,next)=>{
  try {
    //TUGAS NOMOR 2 cari user berdasarkan userId
    const {userId} = req.params
  } catch (error) {
    console.log(error.message);
  }
}

//handler register
const postUser = async(req,res,next)=>{
  try {
    const {
      fullName, nim, angkatan, email, password, division
    } = req.body;

    //hashed password user    
    const hashedPassword = await bcrypt.hash(password, 5);

    //cari divisi id
    //pakai await untuk menghindari penulisan then
    const user_division = await Division.findOne({
      where:{
        name: division
      }
    });

    //SELECT * FROM DIVISION WHERE name = division
    if(user_division == undefined){
      const error = new Error(`division ${division} is not existed!`);
      error.statusCode = 400;
      throw error;
    }

    //insert data ke tabel User
    const currentUser = await User.create({
      //nama field: data
      fullName: fullName,
      //jika nama field == data maka bisa diringkas
      email,
      password : hashedPassword,
      angkatan,
      nim,
      divisionId: user_division.id,
      role: "MEMBER"
    });

    const token = jwt.sign({
      userId: currentUser.id,
      role: currentUser.role
    }, key, {
      algorithm: "HS256",
      expiresIn: "1h"
    })

    //send response
    res.status(201).json({
      status: "success",
      message: "Register Successfull!",
      token
    })

  } catch (error) {
    //jika status code belum terdefined maka status = 500;
    res.status(error.statusCode || 500).json({
      status: "Error",
      message: error.message
    })
  }
};

const loginHandler = async (req,res,next)=>{
  try {
    // ambil data dari req body
    console.log("test");
    const { email, password} = req.body;
    console.log(email, password)
    const currentUser = await User.findOne({
      where:{
        //namaKolom: data_request_body
        email: email
      }
    });
    //apabila user tidak ditemukan
    if (currentUser == undefined){
      const error = new Error("wrong email or password");
      error.statusCode = 400;
      throw error;
    }
    const checkPassword = await bcrypt.compare(password, currentUser.password); 

    //apabila password salah / tidak matched
    if (checkPassword === false){
      const error = new Error("wrong email or password");
      error.statusCode = 400;
      throw error;
    }

    const token = jwt.sign({
      userId: currentUser.id,
      role: currentUser.role
    }, key,{
      algorithm: "HS256",
      expiresIn: "1h"
    })

    res.status(200).json({
      status: "Success",
      message: "Login Successfull!",
      token
    })

  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: "errorr",
      message: error.message
    })
  }
}

const deleteUser = async(req,res,next)=>{
  //hanya admin yang bisa ngedelete
  try {
    //step 1 mengambil token
    //mengambil header
    const header = req.headers;
    
    //mengambil header authnya
    const authorization = header.authorization;
    console.log(authorization); //Bearer <token>
    let token;

    //console.log(authorization); //Bearer token...
    if(authorization !== undefined && authorization.startsWith("Bearer ")){
      //mengilangkan string "Bearer "
      token = authorization.substring(7); 
      //token akan bernilai token
    }else{
      const error = new Error("You need to login");
      error.statusCode = 403;
      throw error;
    }
    //ekstrak payloadnya agar bisa mendapatkan userId dan role
    const decoded = jwt.verify(token, key);
    
    //decoded mempunyai 2 property yaitu userId dan role
    if(decoded.role !== "ADMIN"){
      const error = new Error("You don't have access!!!");
      error.statusCode = 403; //FORBIDDEN
      throw error;
    }

    //menjalankan operasi hapus
    const {userId} = req.params;
    
    const targetedUser = await User.destroy({
      where:{
        id: userId
      }
    })

    if(targetedUser === undefined){
      const error = new Error(`User with id ${userId} is not existed`);
      error.statusCode = 400;
      throw error;
    }

    res.status(200).json({
      status: "Success",
      message: "Successfully delete user"
    })
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: "Error",
      message: error.message
    })
  }
}

//TODO 1
//const getUserByToken = async(req,res,next)=>{
  //tugas lengkapi codingan
  //hanya user yang telah login bisa mengambil data dirinya dengan mengirimkan token
  //step 1 ambil token

  //step 2 ekstrak payload menggunakan jwt.verify

  //step 3 cari user berdasarkan payload.userId

//}

const getUserByToken = async (req, res, next) => {
  try {
    //step 1 ambil token
    const header = req.headers;
    const authorization = header.authorization;
    let token;

    if (authorization !== undefined && authorization.startsWith('Bearer ')) {
      token = authorization.substring(7);
    }
    // } else {
    //   const error = new Error('You need to login');
    //   error.statusCode = 403;
    //   throw error;
    // }

    //step 2 ekstrak payload menggunakan jwt.verify
    const decoded = jwt.verify(token, key);

    //step 3 cari user berdasarkan payload.userId
    const currentUser = await User.findByPk(decoded.userId, {
      attributes: ['id', 'fullName', 'nim', 'angkatan', 'profilePicture', 'divisionId'],
      include: {
        model: Division,
        attributes: ['name'], // Fix: Use 'name' instead of 'Division.name'
      },
    });

    if (!currentUser) {
      const error = new Error(`User with id ${decoded.userId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const responseUser = {
      id: currentUser.id,
      fullName: currentUser.fullName,
      angkatan: currentUser.angkatan,
      division: {
        name: currentUser.division.name,
      },
      
    };

    res.status(200).json({
      status: 'Success',
      message: 'Successfully fetch user data',
      user: responseUser,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: 'Error',
      message: error.message,
    });
  }
};


const updateUserByToken = async (req, res, next) => {
  try {
    // Step 1: Get the token from the request headers
    const header = req.headers;
    const authorization = header.authorization;
    let token;

    if (authorization !== undefined && authorization.startsWith('Bearer ')) {
      token = authorization.substring(7);
    } else {
      const error = new Error('You need to login');
      error.statusCode = 403;
      throw error;
    }

    // Step 2: Extract payload using jwt.verify
    const decoded = jwt.verify(token, key);

    // Step 3: Find the user based on payload.userId
    const currentUser = await User.findByPk(decoded.userId);

    if (!currentUser) {
      const error = new Error(`User with id ${decoded.userId} not found`);
      error.statusCode = 404;
      throw error;
    }

    // Step 4: Update user data based on the request body
    const { fullName, nim, angkatan, email, password, division } = req.body;

    // Update user fields if provided in the request body
    if (fullName) currentUser.fullName = fullName;
    if (nim) currentUser.nim = nim;
    if (angkatan) currentUser.angkatan = angkatan;
    if (email) currentUser.email = email;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 5);
      currentUser.password = hashedPassword;
    }
    if (division) {
      const userDivision = await Division.findOne({
        where: {
          name: division,
        },
      });

      if (!userDivision) {
        const error = new Error(`Division ${division} is not existed!`);
        error.statusCode = 400;
        throw error;
      }

      currentUser.divisionId = userDivision.id;
    }

    // Step 5: Save the updated user
    await currentUser.save();

    res.status(200).json({
      status: 'Success',
      message: 'User updated successfully',
      user: currentUser,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: 'Error',
      message: error.message,
    });
  }
};


module.exports = {
  getAllUser, getUserById, postUser, deleteUser, loginHandler, getUserByToken, updateUserByToken
}
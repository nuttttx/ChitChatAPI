var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mysql = require('mysql');
var bcrypt = require('bcrypt')
const logger = require('morgan')
const multer = require('multer')
const path = require('path');

app.use(logger("dev"))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
     extended: true
}));
app.use(express.static(path.join(__dirname, 'public')))

var fileNamePost = ""
var fileNameProfile = ""
const storageProfile = multer.diskStorage({
     destination: function (req, file, cb) {
          cb(null, path.join(__dirname, './public/profile'))
     },
     filename: function (req, file, cb) {
          let user_id = req.params.user_id
          const postFix = file.originalname.split('.').pop();
          fileNameProfile = `${user_id}.${postFix}`
          return cb(null, fileNameProfile)
     }
})
const storagePosts = multer.diskStorage({
     destination: function (req, file, cb) {
          cb(null, path.join(__dirname, './public/posts'))
     },
     filename: function (req, file, cb) {
          fileNamePost = `${Date.now()}-${file.originalname}`
          return cb(null, fileNamePost)

     }
})

const uploadProfile = multer({ storage: storageProfile })
const uploadPosts = multer({ storage: storagePosts })

// ตัวอย่างเส้นทาง API เพิ่มโพสต์ใหม่ ไม่ได้ใช้
app.post("/upload/post", uploadPosts.single('img'), async (req, res) => {
     var imageFile = req.file;
     console.log(imageFile);
     if (!imageFile) {
          return res.status(400).json({
               error: 'provider file image.',
          });
     } else {
          try {
               const imgsrc = `/posts/${fileNamePost}`
               console.log(imgsrc);
               res.status(200).json({
                    ok: true,
                    message: "Insert success"
               });
          } catch (error) {
               console.error(error);
               res.status(400).json({
                    message: "Insert fail",
                    error,
               });
          }
     }
});

// เส้นทาง API เพิ่มโพสต์ใหม่
app.post("/uploadPosts", uploadPosts.single('img'), async (req, res) => {
     const { text, user_id } = req.body;
     var imageFile = req.file;
     console.log(imageFile);
     if (!imageFile) {
          return res.status(400).json({
               error: 'provider file image.',
          });
     }
     if (!text || !user_id) {
          return res.status(400).send({ error: true, message: 'Missing required fields' });
     }

     try {
          // เพิ่มโพสต์ใหม่ลงในฐานข้อมูล
          const img = `http://10.0.2.2:3000/posts/${fileNamePost}`
          const insertPostQuery = 'INSERT INTO post (text, img, user_id) VALUES (?, ?, ?)';
          dbConn.query(insertPostQuery, [text, img, user_id], (error, results) => {
               if (error) {
                    return res.status(500).send({ error: true, message: 'Error inserting post into database' });
               }
               return res.send({ success: true, message: 'Post created successfully' });
          });
     } catch (error) {
          console.error(error);
          res.status(400).json({
               message: "Insert fail",
               error,
          });
     }
});

// เส้นทาง API เพิ่ม profile
app.put("/uploadProfile/:user_id", uploadProfile.single('img'), async (req, res) => {
     let user_id = req.params.user_id;
     var imageFile = req.file;
     console.log(imageFile);
     if (!imageFile) {
          return res.status(400).json({
               error: 'provider file image.',
          });
     }
     if (!user_id) {
          return res.status(400).send({ error: true, message: 'Missing required fields' });
     }

     try {
          // อัปเดตข้อมูลรูปภาพโปรไฟล์ใหม่ในฐานข้อมูล
          const img = `http://10.0.2.2:3000/profile/${fileNameProfile}`
          const updateProfileQuery = 'UPDATE user SET img = ? WHERE user_id = ?';
          dbConn.query(updateProfileQuery, [img, user_id], (error, results) => {
               if (error) {
                    return res.status(500).send({ error: true, message: 'Error updating profile image in database' });
               }
               return res.send({ success: true, message: 'Profile image updated successfully' });
          });
     } catch (error) {
          console.error(error);
          res.status(400).json({
               message: "Update fail",
               error,
          });
     }
});



app.get('/', function (req, res) {
     return res.send({ error: true, message: 'Test User Web API' });
});


var dbConn = mysql.createConnection({
     host: 'localhost',
     user: 'root',
     password: '',
     database: 'project_mobile'
});


dbConn.connect();
app.get('/allUser', function (req, res) {
     dbConn.query('SELECT * FROM user', function (error, results, fields) {
          if (error) throw error;
          return res.send(results);
     });
});



//ข้อมูลผู้ใช้รายบุคคล เสร็จ ไปแสดงหน้าprofile
app.get('/profile/:user_id', function (req, res) {
     let user_id = req.params.user_id;

     if (!user_id) {
          return res.status(400).send({ error: true, message: 'กรุณาระบุผู้ใช้' });
     }
     let getUserQuery = `
          SELECT *
          FROM user
          WHERE user_id = ?
     `;

     dbConn.query(getUserQuery, user_id, function (error, userResults, fields) {
          if (error) throw error;

          // ตรวจสอบว่าพบข้อมูลผู้ใช้หรือไม่
          if (userResults.length === 0) {
               return res.status(400).send({ error: true, message: 'ไม่พบข้อมูลผู้ใช้' });
          }

          // ส่งข้อมูลผู้ใช้กลับไปยัง client
          return res.send(userResults[0]);
     });
});



app.post('/insertAccount', async function (req, res) {
     try {
          let post = req.body;
          let user_name = post.user_name;
          let email = post.email;
          let password = post.password;
          let gender = post.gender;
          let img = post.img;

          // Check if the email already exists
          dbConn.query('SELECT * FROM user WHERE email = ?', [email], async function (error, results, fields) {
               if (error) {
                    throw error;
               }

               if (results.length > 0) {
                    return res.status(400).send({ error: true, message: 'This email is already registered.' });
               } else {

                    const salt = await bcrypt.genSalt(10);
                    let password_hash = await bcrypt.hash(password, salt);

                    var insertData = "INSERT INTO user(user_name, email, password, img, gender) VALUES(?, ?, ?, ?, ?)";

                    dbConn.query(insertData, [user_name, email, password_hash, img, gender], (error, results) => {
                         if (error) {
                              return res.status(500).send({ error: true, message: 'Error inserting data into database' });
                         }
                         return res.send(results);
                    });
               }
          });
     } catch (error) {
          console.error("Error:", error);
          return res.status(500).send({ error: true, message: 'Internal Server Error' });
     }
});





app.get('/search/:user_name', function (req, res) {
     let user_name = req.params.user_name;
     if (!user_name) {
          return res.status(400).send({ error: true, message: 'Please provide User name' });
     }

     // ใช้ LIKE ใน SQL เพื่อค้นหาผู้ใช้ที่มีชื่อที่ตรงกับส่วนของ user_name ที่ระบุ
     dbConn.query('SELECT * FROM user WHERE user_name LIKE ?', user_name, function (error, results, fields) {
          if (error) throw error;
          if (results[0]) {
               return res.send({ "user_id": results[0].user_id, "user_name": results[0].user_name, "gender": results[0].gender, "img": results[0].img });
          } else {
               return res.status(400).send({ error: true, message: 'User name Not Found!!' });
          }
     });
});


app.get('/login/:email/:password', async function (req, res) {
     let email = req.params.email; // เปลี่ยน user_name เป็น email
     let password = req.params.password;
     if (!email || !password) { // เปลี่ยน user_name เป็น email
          return res.status(400).send({ error: true, message: 'Please Provide Email and Password.' }); // เปลี่ยน User name เป็น Email
     }
     dbConn.query('SELECT * FROM user WHERE email = ? ', [email], function (error, results, fields) {
          if (error) throw error;
          if (results[0]) {
               bcrypt.compare(password, results[0].password, function (error, result) {
                    if (error) throw error;
                    if (result) {
                         return res.send({
                              "success": 1, "user_id": results[0].user_id, "email": results[0].email, "gender": results[0].gender // เปลี่ยน user_name เป็น email
                         });
                    } else {
                         return res.send({ "success": 0 });
                    }
               });
          } else {
               return res.send({ "success": 0 });
          }
     });
});


// ดึงรายการเพื่อนของผู้ใช้
app.get('/friends/:user_id', (req, res) => {
     const user_id = req.params.user_id;
     if (!user_id) {
          return res.status(400).send({ error: true, message: 'Please provide user ID' });
     }

     // Query to retrieve friend IDs for the user
     const getFriendIdsQuery = 'SELECT receive_user_id FROM request WHERE send_user_id = ? AND status = 1 UNION SELECT send_user_id FROM request WHERE receive_user_id = ? AND status = 1';
     dbConn.query(getFriendIdsQuery, [user_id, user_id], (error, friendResults) => {
          if (error) {
               return res.status(500).send({ error: true, message: 'Error retrieving user\'s friends' });
          }

          // Extract friend IDs from the results
          const friendIds = friendResults.map(result => result.receive_user_id);
          friendIds.push(parseInt(user_id)); // Add the user's own ID to the friend list

          // Query to retrieve friend details
          const getFriendsQuery = 'SELECT * FROM user WHERE user_id IN (?)';
          dbConn.query(getFriendsQuery, [friendIds], (error, friendDetails) => {
               if (error) {
                    return res.status(500).send({ error: true, message: 'Error retrieving friend details' });
               }
               return res.send(friendDetails);
          });
     });
});


// รับข้อมูลจากฟอร์มแก้ไขโปรไฟล์
app.put('/edit-profile/:user_id', async (req, res) => {
     try {
          const userId = req.params.user_id;
          const { user_name, email, img, gender } = req.body;


          // อัปเดตข้อมูลโปรไฟล์
          const updateProfileQuery = `
          UPDATE user SET user_name = ?, 
          email = ?, 
          img = ?, gender = ?
          WHERE user_id = ?`;
          dbConn.query(updateProfileQuery, [user_name, email, img, gender, userId], (error, results) => {
               if (error) {
                    return res.status(500).send({ error: true, message: 'Error updating profile' });
               }
               return res.send({ success: true, message: 'Profile updated successfully' });
          });
     } catch (error) {
          console.error("Error:", error);
          return res.status(500).send({ error: true, message: 'Internal Server Error' });
     }
});




//ดึงข้อมูลแค่ละโพสต์
app.get('/post/:post_id', (req, res) => {
     const postId = req.params.post_id;

     // สร้างคำสั่ง SQL สำหรับการเลือกโพสต์โดยใช้ post_id
     const selectPostQuery = 'SELECT * FROM post WHERE post_id = ?';

     dbConn.query(selectPostQuery, [postId], (error, results) => {
          if (error) {
               return res.status(500).send({ error: true, message: 'Error retrieving post' });
          }

          // ตรวจสอบว่ามีโพสต์ที่มี post_id ที่ระบุหรือไม่
          if (results.length === 0) {
               return res.status(404).send({ error: true, message: 'Post not found' });
          }

          // ส่งข้อมูลโพสต์ที่พบกลับไป
          const post = results[0];
          return res.send({ success: true, post });
     });
});




// อย่าลืมลบ ข้างบนมีอยู่เส้นทาง API เพิ่ม profile
app.put("/uploadProfile/:user_id", uploadProfile.single('img'), async (req, res) => {
     let user_id = req.params.user_id;
     var imageFile = req.file;
     console.log(imageFile);
     if (!imageFile) {
          return res.status(400).json({
               error: 'provider file image.',
          });
     }
     if (!user_id) {
          return res.status(400).send({ error: true, message: 'Missing required fields' });
     }

     try {
          // อัปเดตข้อมูลรูปภาพโปรไฟล์ใหม่ในฐานข้อมูล
          const img = `http://10.0.2.2:3000/profile/${fileNameProfile}`
          const updateProfileQuery = 'UPDATE user SET img = ? WHERE user_id = ?';
          dbConn.query(updateProfileQuery, [img, user_id], (error, results) => {
               if (error) {
                    return res.status(500).send({ error: true, message: 'Error updating profile image in database' });
               }
               return res.send({ success: true, message: 'Profile image updated successfully' });
          });
     } catch (error) {
          console.error(error);
          res.status(400).json({
               message: "Update fail",
               error,
          });
     }
});

//แก้ไขโพสต์ รูป
app.put('/editPost/:post_id', uploadPosts.single('img'), (req, res) => {
     let postId = req.params.post_id;
     var imageFile = req.file;
     // const {text} = req.body
     // console.log(text,postId,imageFile);

     // ตรวจสอบว่ามีข้อความหรือรหัสผู้ใช้หรือไม่
     if (!imageFile) {
          return res.status(400).json({
               error: 'provider file image.',
          });
     }
     if (!postId) {
          return res.status(400).send({ error: true, message: 'Missing required fields' });
     }
     try {
          // เพิ่มโพสต์ใหม่ลงในฐานข้อมูล
          const img = `http://10.0.2.2:3000/posts/${fileNamePost}`
          const updatePostQuery = `
          UPDATE post SET 
          img = ? 
          WHERE post_id = ?
          `;
          console.log(img, postId);
          dbConn.query(updatePostQuery, [img, postId], (error, results) => {
               if (error) {
                    return res.status(500).send({ error: true, message: 'Error UPDATE post into database' });
               }
               return res.send({ success: true, message: 'Post UPDATE successfully' });
          });
     } catch (error) {
          console.error(error);
          res.status(400).json({
               message: "Update fail",
               error,
          });
     }
});



// เส้นทาง API ลบโพสต์
app.put('/deletePost/:post_id', async (req, res) => {
     try {
          const postId = req.params.post_id;

          // อัปเดตสถานะเป็น delete_at = 1 แทนการลบโพสต์จริงๆ
          const softDeletePostQuery = 'UPDATE post SET delete_at = 1 WHERE post_id = ?';
          dbConn.query(softDeletePostQuery, [postId], (error, results) => {
               if (error) {
                    return res.status(500).send({ error: true, message: 'Error deleting Post request' });
               }
               return res.send({ success: true, message: 'Post soft deleted successfully' });
          });
     } catch (error) {
          console.error("Error:", error);
          return res.status(500).send({ error: true, message: 'Internal Server Error' });
     }
});


// เส้นทาง API ดึงโพสต์ของผู้ใช้รายคน
app.get('/user-posts/:user_id', function (req, res) {
     let user_id = req.params.user_id;

     if (!user_id) {
          return res.status(400).send({ error: true, message: 'กรุณาระบุผู้ใช้' });
     }

     let query = `
          SELECT 
          post.*,
          user.user_name, user.img as user_img,
          likes.status,likes.user_id as like_user_id,likes.post_id as like_post_id,
          COUNT(DISTINCT comment.comment_id) AS comment_count,
          COUNT(DISTINCT CASE WHEN likes.status = 1 THEN likes.like_id ELSE NULL END) AS like_count
          FROM 
          post
          INNER JOIN 
          user ON post.user_id = user.user_id 
          LEFT JOIN 
          comment ON post.post_id = comment.post_id
          LEFT JOIN 
          likes ON post.post_id = likes.post_id
          WHERE 
          post.user_id = ? AND post.delete_at = 0
          GROUP BY 
          post.post_id
          ORDER BY 
          post.create_at DESC;
     `;

     dbConn.query(query, user_id, function (error, results, fields) {
          if (error) throw error;
          return res.send(results);
     });
});


// เส้นทาง API ดึงโพสต์ตามผู้ใช้งานและเพื่อน
app.get('/posts/:user_id', (req, res) => {
     const user_id = req.params.user_id;
     if (!user_id) {
          return res.status(400).send({ error: true, message: 'Please provide user ID' });
     }

     // ดึงรายการเพื่อนของผู้ใช้
     const getFriendIdsQuery = 'SELECT receive_user_id FROM request WHERE send_user_id = ? AND status = 1 UNION SELECT send_user_id FROM request WHERE receive_user_id = ? AND status = 1';
     dbConn.query(getFriendIdsQuery, [user_id, user_id], (error, friendResults) => {
          if (error) {
               return res.status(500).send({ error: true, message: 'Error retrieving user\'s friends' });
          }

          // ดึงโพสต์ของผู้ใช้และเพื่อน
          const friendIds = friendResults.map(result => result.receive_user_id);
          friendIds.push(user_id); // เพิ่ม user_id ของผู้ใช้เองเข้าไปด้วย
          // COUNT(DISTINCT likes.like_id) AS like_count เอาไว้นับไลค์
          const getPostsQuery = `
               SELECT post.*, 
               user.user_name, user.img as user_img,
               likes.status,likes.user_id as like_user_id,likes.post_id as like_post_id,
               COUNT(DISTINCT comment.comment_id) AS comment_count,
               COUNT(DISTINCT CASE WHEN likes.status = 1 THEN likes.like_id ELSE NULL END) AS like_count
               FROM post 
               INNER JOIN user ON post.user_id = user.user_id 
               LEFT JOIN comment ON post.post_id = comment.post_id
               LEFT JOIN likes ON post.post_id = likes.post_id
               WHERE post.user_id IN (?) AND post.delete_at = 0
               GROUP BY post.post_id
               ORDER BY post.create_at DESC
          `;
          dbConn.query(getPostsQuery, [friendIds], (error, postResults) => {
               if (error) {
                    return res.status(500).send({ error: true, message: 'Error retrieving posts' });
               }
               return res.send(postResults);
          });
     });
});


// เส้นทาง API เพิ่มความคิดเห็น
app.post('/comment', (req, res) => {
     const { text, user_id, post_id } = req.body;
     console.log(post_id);
     if (!text || !user_id || !post_id) {
          console.log(req.body);
          console.log(text, user_id, post_id);
          return res.status(400).send({ error: true, message: 'Missing required fields' });
     }


     const insertCommentQuery = 'INSERT INTO comment (text, user_id, post_id) VALUES (?, ?, ?)';
     dbConn.query(insertCommentQuery, [text, user_id, post_id], (error, results) => {
          if (error) {
               return res.status(500).send({ error: true, message: 'Error inserting comment into database' });
          }
          return res.send({ success: true, message: 'Comment added successfully' });
     });
});

//ดึงคอมเมนต์แต่ละโพสต์
app.get('/comment/:post_id', function (req, res) {
     let post_id = req.params.post_id;

     if (!post_id) {
          return res.status(400).send({ error: true, message: 'เลือกโพส' });
     }

     dbConn.query(`
     SELECT c.comment_id, c.text, c.post_id, c.create_at, c.delete_at, u.user_name, u.img  FROM comment c, user u 
     WHERE c.user_id = u.user_id
     AND c.post_id = ?
     `, post_id, function (error, results, fields) {
          if (error) throw error;


          if (results[0]) {
               return res.send(results);
          } else {
               return res.status(400).send({ error: true, message: 'User id Not Found!!' });
          }
     });
});

// เส้นทาง API ลบความคิดเห็น
app.delete('/comment/:comment_id', (req, res) => {
     const commentId = req.params.comment_id;

     const deleteCommentQuery = 'DELETE FROM comment WHERE comment_id = ?';
     dbConn.query(deleteCommentQuery, [commentId], (error, results) => {
          if (error) {
               return res.status(500).send({ error: true, message: 'Error deleting comment from database' });
          }
          return res.send({ success: true, message: 'Comment deleted successfully' });
     });
});

// เส้นทาง API สร้างคำขอเป็นเพื่อน
app.post('/friend-request/:user_id', async (req, res) => {
     try {
          const send_user_id = req.params.user_id; // Assuming user_id of the logged-in user is available in the request
          const { receive_user_id } = req.body;

          // ตรวจสอบว่ามีคำขอเป็นเพื่อนที่เคยส่งไปแล้วหรือไม่
          const checkExistingRequestQuery = 'SELECT * FROM request WHERE send_user_id = ? AND receive_user_id = ?';
          dbConn.query(checkExistingRequestQuery, [send_user_id, receive_user_id], async (error, results) => {
               if (error) {
                    throw error;
               }

               if (results.length > 0) {
                    return res.status(400).send({ error: true, message: 'Friend request already sent' });
               } else {
                    // สร้างคำขอเป็นเพื่อนใหม่

                    const insertRequestQuery = 'INSERT INTO request (send_user_id, receive_user_id, status) VALUES (?, ?, 0)';
                    dbConn.query(insertRequestQuery, [send_user_id, receive_user_id, create_at], (error, results) => {
                         if (error) {
                              return res.status(500).send({ error: true, message: 'Error creating friend request' });
                         }
                         return res.send({ success: true, message: 'Friend request sent successfully' });
                    });
               }
          });
     } catch (error) {
          console.error("Error:", error);
          return res.status(500).send({ error: true, message: 'Internal Server Error' });
     }
});


// เส้นทาง API ลบคำขอเป็นเพื่อน
app.delete('/friend-request/:request_id', async (req, res) => {
     try {
          const requestId = req.params.request_id;

          // ลบคำขอเป็นเพื่อนจากฐานข้อมูล
          const deleteRequestQuery = 'DELETE FROM request WHERE request_id = ?';
          dbConn.query(deleteRequestQuery, [requestId], (error, results) => {
               if (error) {
                    return res.status(500).send({ error: true, message: 'Error deleting friend request' });
               }
               return res.send({ success: true, message: 'Friend request deleted successfully' });
          });
     } catch (error) {
          console.error("Error:", error);
          return res.status(500).send({ error: true, message: 'Internal Server Error' });
     }
});

// เพิ่มการกดไลค์โพสต์
// เส้นทาง API เพิ่ม/สลับไลค์
app.post('/likePost', async (req, res) => {
     const { post_id, user_id } = req.body;
     // ตรวจสอบว่ามีการกดไลค์โพสต์แล้วหรือไม่
     const checkLikeQuery = `SELECT * FROM likes WHERE post_id = ${post_id} AND user_id = ${user_id}`;
     dbConn.query(checkLikeQuery, (err, result) => {
          if (err) {
               res.status(500).send({ error: 'Database error' });
          } else {
               if (result.length > 0) {
                    let currentStatus = result[0].status;

                    // สลับค่าสถานะ
                    const newStatus = currentStatus === 1 ? 0 : 1;
                    // อัปเดตสถานะ
                    const updateLikeQuery = `UPDATE likes SET status = ${newStatus} WHERE post_id = ${post_id} AND user_id = ${user_id}`;
                    dbConn.query(updateLikeQuery, (err, result) => {
                         if (err) {
                              res.status(500).send({ error: 'Database error' });
                         } else {
                              const message = newStatus === 1 ? 'Like successfully' : 'Unlike successfully';
                              res.status(200).send({ message, "status": newStatus });
                         }
                    });
               } else {
                    // ถ้ายังไม่ได้กดไลค์ สร้างการกดไลค์ใหม่
                    const addLikeQuery = `INSERT INTO likes (status, user_id, post_id) VALUES (1, ${user_id}, ${post_id})`;
                    dbConn.query(addLikeQuery, (err, result) => {
                         if (err) {
                              res.status(500).send({ error: 'Database error' });
                         } else {
                              res.status(200).send({ message: 'Like successfully' });
                         }
                    });
               }
          }
     });
});

//เอาstatus like
app.get("/getlike/:user_id/:post_id", function (req, res) {
     let user_id = req.params.user_id;
     let post_id = req.params.post_id;

     let getLikeQuery = `SELECT status FROM likes WHERE user_id = ${user_id} AND post_id = ${post_id}`;

     // Execute the SQL query
     dbConn.query(getLikeQuery, (err, result) => {
          if (err) {
               res.status(500).send({ error: 'Database error' });
          } else {
               if (result.length > 0) {
                    const status = result[0].status;
                    res.status(200).send({ status });
               } else {
                    res.status(200).send({ status: 0 });
               }
          }
     });
});

// โค้ดฟาง=================================================================================================================================================================================================================================
//เส้นทางค้นหาชื่อผู้ใช้
app.get('/search/:user_name', function (req, res) {
     let user_name = req.params.user_name;
     if (!user_name) {
          return res.status(400).send({ error: true, message: 'Please provide User name' });
     }

     // ใช้ LIKE ใน SQL เพื่อค้นหาผู้ใช้ที่มีชื่อที่ตรงกับส่วนของ user_name ที่ระบุ
     dbConn.query('SELECT * FROM user WHERE user_name LIKE ?', user_name, function (error, results, fields) {
          if (error) throw error;
          if (results[0]) {
               return res.send({ "user_id": results[0].user_id, "user_name": results[0].user_name, "gender": results[0].gender, "img": results[0].img });
          } else {
               return res.status(400).send({ error: true, message: 'User name Not Found!!' });
          }
     });
});


//ดึงรายการเพื่อนของผู้ใช้ 
app.get('/friend/:user_id', (req, res) => {
     const user_id = req.params.user_id;
     if (!user_id) {
          return res.status(400).send({ error: true, message: 'Please provide user ID' });
     }

     // Query to retrieve friend IDs for the user
     const q = 'SELECT user.*, request.* FROM user JOIN request ON user.user_id = request.receive_user_id WHERE request.send_user_id = ? AND request.status = 1 AND request.delete_at = 0 UNION SELECT user.*, request.* FROM user JOIN request ON user.user_id = request.send_user_id WHERE request.receive_user_id = ? AND request.status = 1 AND request.delete_at = 0';
     dbConn.query(q, [user_id, user_id], (error, friendResults) => {
          if (error) {
               return res.status(500).send({ error: true, message: 'Error retrieving user\'s friends' });
          }

          return res.send(friendResults);
     });
});


//เส้นทางลบเพื่อน ฟางแก้
app.put('/friends/:request_id', (req, res) => {
     const request_id = req.params.request_id;

     if (!request_id) {
          return res.status(400).send({ error: true, message: 'Please provide request ID' });
     }

     // Query to find friends of the user
     const findFriendsQuery = 'SELECT * FROM request WHERE status = 1';
     dbConn.query(findFriendsQuery, [request_id, request_id], (error, friendResults) => {
          if (error) {
               return res.status(500).send({ error: true, message: 'Error finding user\'s friends' });
          }

          // Loop through the friend results and update each friend relationship to soft delete
          friendResults.forEach(friend => {
               // Check if the friend is actually the user's friend
               if (friend.request_id == request_id) {
                    const softDeleteFriendQuery = 'UPDATE request SET delete_at = 1 WHERE request_id = ?';
                    dbConn.query(softDeleteFriendQuery, [request_id], (deleteError, deleteResults) => {
                         if (deleteError) {
                              console.error('Error soft deleting friend:', deleteError);
                         }
                    });
               }
          });

          return res.send({ error: false, message: 'Friends soft deleted successfully' });
     });
});

// สร้าง API แสดงรายการขอเป็นเพื่อน ฟางเพิ่ม
app.get('/friend-requests/:user_id', (req, res) => {
     const user_id = req.params.user_id;

     if (!user_id) {
          return res.status(400).send({ error: true, message: 'Please provide user ID' });
     }

     // Query to retrieve friend requests for the user
     const getFriendRequestsQuery = 'SELECT * FROM request r, user u WHERE r.send_user_id = u.user_id AND r.receive_user_id  = ? AND r.status = 0';

     dbConn.query(getFriendRequestsQuery, [user_id], (error, friendRequestResults) => {
          if (error) {
               return res.status(500).send({ error: true, message: 'Error retrieving friend requests' });
          }
          return res.send(friendRequestResults);
          // Extract user IDs from the results
          const userIDs = friendRequestResults.map(result => result.send_user_id);

          // Query to retrieve user details of those who sent friend requests
          const getUserDetailsQuery = 'SELECT * FROM user WHERE user_id IN (?)';
          dbConn.query(getUserDetailsQuery, [userIDs], (error, userDetails) => {
               if (error) {
                    return res.status(500).send({ error: true, message: 'Error retrieving user details' });
               }
               return res.send(userDetails);
          });
     });
});

// เส้นทาง API สร้างคำขอเป็นเพื่อน
app.post('/friend-request', async (req, res) => {
     try {
          const { send_user_id, receive_user_id } = req.body;

          // ตรวจสอบว่ามีคำขอเป็นเพื่อนที่เคยส่งไปแล้วหรือไม่
          const checkExistingRequestQuery = 'SELECT * FROM request WHERE send_user_id = ? AND receive_user_id = ?';
          dbConn.query(checkExistingRequestQuery, [send_user_id, receive_user_id], async (error, results) => {
               if (error) {
                    throw error;
               }

               if (results.length > 0) {
                    return res.status(400).send({ error: true, message: 'Friend request already sent' });
               } else {
                    // สร้างคำขอเป็นเพื่อนใหม่
                    const create_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
                    const insertRequestQuery = 'INSERT INTO request (send_user_id, receive_user_id, status, create_at) VALUES (?, ?, 0, ?)';
                    dbConn.query(insertRequestQuery, [send_user_id, receive_user_id, create_at], (error, results) => {
                         if (error) {
                              return res.status(500).send({ error: true, message: 'Error creating friend request' });
                         }
                         return res.send({ success: true, message: 'Friend request sent successfully' });
                    });
               }
          });
     } catch (error) {
          console.error("Error:", error);
          return res.status(500).send({ error: true, message: 'Internal Server Error' });
     }
});

// เส้นทาง API ยอมรับคำขอเป็นเพื่อน 
app.put('/friend-request/accept/:request_id', async (req, res) => {
     try {
          const requestId = req.params.request_id;

          // อัปเดตสถานะของคำขอเป็นเพื่อนให้เป็นยอมรับ (status = 1)
          const updateRequestQuery = 'UPDATE request SET status = 1 WHERE request_id = ?';
          dbConn.query(updateRequestQuery, [requestId], (error, results) => {
               if (error) {
                    return res.status(500).send({ error: true, message: 'Error accepting friend request' });
               }
               return res.send({ success: true, message: 'Friend request accepted successfully' });
          });
     } catch (error) {
          console.error("Error:", error);
          return res.status(500).send({ error: true, message: 'Internal Server Error' });
     }
});


// เส้นทาง API ลบคำขอเป็นเพื่อน
app.delete('/friend-request/:request_id', async (req, res) => {
     try {
          const requestId = req.params.request_id;

          // ลบคำขอเป็นเพื่อนจากฐานข้อมูล
          const deleteRequestQuery = 'DELETE FROM request WHERE request_id = ?';
          dbConn.query(deleteRequestQuery, [requestId], (error, results) => {
               if (error) {
                    return res.status(500).send({ error: true, message: 'Error deleting friend request' });
               }
               return res.send({ success: true, message: 'Friend request deleted successfully' });
          });
     } catch (error) {
          console.error("Error:", error);
          return res.status(500).send({ error: true, message: 'Internal Server Error' });
     }
});




// ให้ Express ทำการรับฟอร์มและคำขอ API บนพอร์ต 3000
app.listen(3000, function () {
     console.log('Node app is running on port 3000');
});
module.exports = app;


const express = require("express")
const pool = require("../config")
const path = require("path")
const bodyParser = require("body-parser")
const { redirect } = require("express/lib/response")
const multer = require("multer")

router = express.Router()

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./static")
  },
  filename: function (req, file, callback) {
    const ext = file.mimetype.split("/")[1]
    callback(null, `/uploads-${file.fieldname}-${Date.now()}.${ext}`)
  },
})
const upload = multer({ storage: storage })

router.get("/", async function (req, res, next) {
  try {
    const [rows, fields] = await pool.query("SELECT * FROM course")
    return res.render("index", { courses: JSON.stringify(rows) })
  } catch (err) {
    return next(err)
  }
})

router.get("/allcourse/:id", async function (req, res, next) {
  const conn = await pool.getConnection()
  await conn.beginTransaction()
  try {
    const [rows, fields] = await conn.query("SELECT * FROM course")
    const [rows1, fields1] = await conn.query("SELECT * FROM user WHERE user_id=?", [req.params.id])
    return res.render("allcourse", { courses: JSON.stringify(rows), users: JSON.stringify(rows1) })
  } catch (err) {
    console.log(err)
    await conn.rollback()
  } finally {
    console.log("finally")
    await conn.release()
  }
})

router.get("/allcourse/", async function (req, res, next) {
  const conn = await pool.getConnection()
  await conn.beginTransaction()
  try {
    const [rows, fields] = await conn.query("SELECT * FROM course")
    res.render("allcoursenotsignin", { courses: JSON.stringify(rows) })
  } catch (err) {
    console.log(err)
    await conn.rollback()
  } finally {
    console.log("finally")
    await conn.release()
  }
})

router.get("/allcourse/not-sign-in/:id", async function (req, res, next) {
  const conn = await pool.getConnection()
  await conn.beginTransaction()
  try {
    const [rows2, fields2] = await conn.query("UPDATE `user` SET status_user=? WHERE user.user_id=?", ["off", req.params.id])
    res.redirect("/allcourse/")
  } catch (err) {
    console.log(err)
    await conn.rollback()
  } finally {
    console.log("finally")
    await conn.release()
  }
})

// my cart
router.get("/mycart/:id", async function (req, res, next) {
  try {
    const [rows1, fields1] = await pool.query("SELECT * FROM `order` WHERE user_id=?", [req.params.id])
    let order_id = rows1[0].order_id
    const [rows2, fields2] = await pool.query("SELECT * FROM `order_item` JOIN `course` USING(course_id) WHERE order_id=?", [order_id])
    const [rows3, fields3] = await pool.query("SELECT * FROM `user` WHERE user_id=?", [req.params.id])
    return res.render("user/cart", { items: JSON.stringify(rows2), users: JSON.stringify(rows3), carts: JSON.stringify(rows1) })
  } catch (err) {
    return next(err)
  }
})

// create cart
router.get("/course/:course_id/create/cart/:user_id/:price", async function (req, res, next) {
  const conn = await pool.getConnection()
  await conn.beginTransaction()
  const admin = Math.floor(Math.random() * (7 - 1)) + 1
  try {
    const [order, fields1] = await conn.query("SELECT * FROM `order` WHERE user_id=?", [req.params.user_id])
    if (order.length > 0) {
      let order_status = order[0].order_status
      let order_id = order[0].order_id
      if (order_status !== "complete") {
        const [additem, fields3] = await conn.query("INSERT INTO order_item (item_price, course_id, order_id) VALUES(?, ?, ?)", [
          req.params.price,
          req.params.course_id,
          order_id,
        ])
      }
    } else {
      const [createcart, fields2] = await conn.query("INSERT INTO `order` (order_date, user_id, admin_id) VALUES(CURDATE(), ?, ?)", [req.params.user_id, admin])
      const [additem, fields3] = await conn.query("INSERT INTO order_item (item_price, course_id, order_id) VALUES(?, ?, ?)", [
        req.params.price,
        req.params.course_id,
        createcart.insertId,
      ])
    }
    await conn.commit()
    res.redirect("/course/" + req.params.course_id + "/" + req.params.user_id)
  } catch (err) {
    await conn.rollback()
    next(err)
  } finally {
    console.log("finally")
    await conn.release()
  }
})

// del items
router.get("/mycart/:id/:item_no", async function (req, res, next) {
  try {
    const [rows1, fields1] = await pool.query("DELETE FROM `order_item` WHERE item_no=?", [req.params.item_no])
    res.redirect("/mycart/" + req.params.id)
  } catch (err) {
    return next(err)
  }
})

// payment
router.get("/mycart/:id/:item_no", async function (req, res, next) {
  try {
    const [rows1, fields1] = await pool.query("DELETE FROM `order_item` WHERE item_no=?", [req.params.item_no])
    res.redirect("/mycart/" + req.params.id)
  } catch (err) {
    return next(err)
  }
})

router.get("/sign-up", async function (req, res, next) {
  res.render("user/sign-up", { message: req.flash("message") })
})

router.get("/sign-up", async function (req, res, next) {
  res.render("user/sign-up", { message: req.flash("message") })
})

router.post("/sign-up", async function (req, res, next) {
  const fname = req.body.fname
  const lname = req.body.lname
  const email = req.body.email
  const password = req.body.password
  const dob = req.body.dob
  const gender = req.body.gender

  const conn = await pool.getConnection()
  await conn.beginTransaction()

  try {
    const [rows, fields] = await conn.query("INSERT INTO user (user_fname, user_lname, email, password, dateofbirth, gender) VALUES(?, ?, ?, ?, ?, ?)", [
      fname,
      lname,
      email,
      password,
      dob,
      gender,
    ])

    await conn.commit()
    res.redirect("/")
  } catch (err) {
    await conn.rollback()
    next(err)
  } finally {
    console.log("finally")
    await conn.release()
  }
})

router.get("/sign-in", async function (req, res, next) {
  res.render("user/sign-in")
})

router.post("/sign-in", async function (req, res, next) {
  const email = req.body.email
  const password = req.body.password

  const conn = await pool.getConnection()
  await conn.beginTransaction()

  try {
    const [rows, fields] = await conn.query("SELECT * FROM user WHERE email=? AND password=?", [email, password])
    const [rows1, fields1] = await conn.query("UPDATE `user` SET status_user=? WHERE email=?", ["on", email])
    await conn.commit()
    if (rows.length > 0) {
      let user_id = rows[0].user_id
      res.redirect("/allcourse/" + user_id)
      // res.redirect("/mycourse/" + user_id)
    } else {
      req.flash("message", "Please Sign-up First.")
      res.redirect("/sign-up")
    }
  } catch (err) {
    await conn.rollback()
    next(err)
  } finally {
    console.log("finally")
    await conn.release()
  }
})

router.get("/reset_password", async function (req, res, next) {
  res.render("user/reset_password")
})

router.post("/reset_password", async function (req, res, next) {
  res.redirect("/")
})

router.get("/profile/:id", async function (req, res, next) {
  const conn = await pool.getConnection()
  await conn.beginTransaction()
  try {
    // const [rows, fields] = await conn.query("SELECT * FROM `user` WHERE user_id=?", [req.params.id])
    const [rows, fields] = await conn.query("SELECT *, dateofbirth, DATE_FORMAT(dateofbirth, GET_FORMAT(DATE, 'ISO')) AS date FROM `user` WHERE user_id=?", [req.params.id])
    res.render("user/user_profile", {
      users: JSON.stringify(rows),
    })
  } catch (err) {
    console.log(err)
    await conn.rollback()
  } finally {
    console.log("finally")
    await conn.release()
  }
})

router.post("/profile/:id", upload.single("image"), async function (req, res, next) {
  const conn = await pool.getConnection()
  await conn.beginTransaction()

  const fname = req.body.fname
  const lname = req.body.lname
  const email = req.body.email
  const password = req.body.password
  const dob = req.body.dob
  const gender = req.body.gender

  const file = req.file
  if (!file) {
    const error = new Error("Please upload a file")
    error.httpStatusCode = 400
    return next(error)
  }
  if (file) {
    await conn.query("UPDATE user SET image=? WHERE user_id=?", [file.path.substring(7), req.params.id])
  }
  try {
    const [rows, fields] = await conn.query("UPDATE `user` SET user_fname=?, user_lname=?, email=?, password=?, dateofbirth=?, gender=? WHERE user_id=?", [
      fname,
      lname,
      email,
      password,
      dob,
      gender,
      req.params.id,
    ])

    let user_id = req.params.id
    res.redirect("/profile/" + user_id)
  } catch (err) {
    console.log(err)
    await conn.rollback()
  } finally {
    console.log("finally")
    await conn.release()
  }
})

// preview page

router.get("/course/:id/:userid", async function (req, res, next) {
  const conn = await pool.getConnection()
  await conn.beginTransaction()
  try {
    const [rows, fields] = await conn.query(
      "SELECT * FROM course join teacher using(teacher_id) join preview using(course_id) join preview_preview_video using(preview_id) WHERE course_id=?",
      [req.params.id]
    )
    const [rows1, fields1] = await conn.query("SELECT * FROM user  WHERE user_id=?", [req.params.userid])

    return res.render("preview", { data: JSON.stringify(rows), users: JSON.stringify(rows1) })
  } catch (err) {
    console.log(err)
    await conn.rollback()
  } finally {
    console.log("finally")
    await conn.release()
  }
})

// preview not-sign-in
router.get("/allcourse/course/:id", async function (req, res, next) {
  const conn = await pool.getConnection()
  await conn.beginTransaction()
  try {
    const [rows, fields] = await conn.query(
      "SELECT * FROM course join teacher using(teacher_id) join preview using(course_id) join preview_preview_video using(preview_id)  WHERE course_id=?",
      [req.params.id]
    )

    return res.render("previewnotsignin", { data: JSON.stringify(rows) })
  } catch (err) {
    console.log(err)
    await conn.rollback()
  } finally {
    console.log("finally")
    await conn.release()
  }
})
// my course
router.get("/allcourse/:id/mycourse", async function (req, res, next) {
  const conn = await pool.getConnection()
  await conn.beginTransaction()
  try {
    const [rows, fields] = await conn.query("SELECT * FROM user WHERE user_id=? ", [req.params.id])
    const [rows1, fields1] = await conn.query("SELECT * FROM order_item join course using(course_id) join `order` using(order_id) join user using(user_id) join course_image using(course_id) WHERE user_id=?", [req.params.id])
    return res.render("own-course", { data: JSON.stringify(rows), users: JSON.stringify(rows1) })
  } catch (err) {
    console.log(err)
    await conn.rollback()
  } finally {
    console.log("finally")
    await conn.release()
  }
})


// info-course
router.get("/course/:id/:userid/learn", async function (req, res, next) {
  const conn = await pool.getConnection()
  await conn.beginTransaction()
  try {
    const [rows, fields] = await conn.query(
      "SELECT * FROM course join teacher using(teacher_id) join preview using(course_id) join preview_preview_video using(preview_id) WHERE course_id=?",
      [req.params.id]
    )
    const [rows1, fields1] = await conn.query("SELECT * FROM user  WHERE user_id=?", [req.params.userid])

    return res.render("info-course", { data: JSON.stringify(rows), users: JSON.stringify(rows1) })
  } catch (err) {
    console.log(err)
    await conn.rollback()
  } finally {
    console.log("finally")
    await conn.release()
  }
})

// router.get("/courseId/allcourse", async function (req, res, next) {
//   try {
//     const [rows, fields] = await pool.query(
//       'SELECT * FROM course join teacher using(teacher_id) WHERE course_id=?',
//       [req.params.courseId]
//     );
//     return res.render("allcourse", { courses: JSON.stringify(rows) });
//   } catch (err) {
//     return next(err)
//   }
// });
exports.router = router

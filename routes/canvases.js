const express = require('express');
const router = express.Router();

// Bring in Article Model
let Canvas = require('../models/canvas');

router.get('/', function(req, res) {
    Canvas.find(function(err, canvases) {
      if (err) res.send(err);
      res.json(canvases);
    });
});

router.get('/:canvas_id/api', function(req, res) {
    Canvas.findById(req.params.canvas_id, function(err, canvas) {
        if (err) res.send(err);
        res.json(canvas);
    });
});

router.get('/:canvas_id', function(req, res) {
    Canvas.findById(req.params.canvas_id, function(err, canvas) {
        if (err) res.send(err);
        if(!canvas) {
            res.redirect('/');
        } else {
            res.render('canvas');
            // 一人なら、getをさせる。dataurlをdrawする。 main.jsの中に書く
        }
    });
});

router.post('/', function(req, res) {
    let canvas = new Canvas(); // create a new instance of the Canvas model
    canvas.filename = "";
    
    canvas.save(function(err) {
      if (err) res.send(err);
      console.log("Canvas created!");
      res.json(canvas);
    });
});

router.delete('/:canvas_id', function(req, res) {
    Canvas.remove({
        _id: req.params.canvas_id
    }, function(err, canvas) {
        if (err) res.send(err);
        console.log("canvas deleted");
        res.json({ message: 'Successfully deleted' });
    });
});

module.exports = router;
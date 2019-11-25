// radius.js
let setRadius = function(newRadius){
  if(newRadius<minRad)
    newRadius = minRad;
  else if(newRadius>maxRad)
    newRadius = maxRad;
  radius = newRadius;
  ctx2.lineWidth = radius * 2;
  radSpan.textContent = radius;
};

let radius,
    minRad = 5,
    maxRad = 105,
    defaultRad = 5,
    radInterval = 10,
    radSpan = document.getElementById('radval'),
    decRad = document.getElementById('decrad'),
    incRad = document.getElementById('incrad');

decRad.addEventListener('click', function(){
  setRadius(radius-radInterval);
});

incRad.addEventListener('click', function(){
  setRadius(radius+radInterval);
});

setRadius(defaultRad);

// alpha.js
let setAlpha = function(newAlpha){
  if(newAlpha<minAlpha)
    newAlpha = minAlpha;
  else if(newAlpha>maxAlpha)
    newAlpha = maxAlpha;
  alpha = newAlpha;
  canvas2.style.opacity = alpha / 100;
  alphaSpan.textContent = alpha;
};

let alpha,
    minAlpha = 0,
    maxAlpha = 100,
    defaultAlpha = 40,
    alphaInterval = 10,
    alphaSpan = document.getElementById('alphaval'),
    decAlpha = document.getElementById('decalpha'),
    incAlpha = document.getElementById('incalpha');

decAlpha.addEventListener('click', function(){
  setAlpha(alpha-alphaInterval);
});

incAlpha.addEventListener('click', function(){
  setAlpha(alpha+alphaInterval);
});

setAlpha(defaultAlpha);

// eraser.js
let eraser = document.getElementById('eraser');

function eraserActivate(){
  // delete active class from swatch
  let active = document.getElementsByClassName('active')[0];
  if(active){
    active.className = 'swatch';
  }
  // set eraserOn class
  eraser.className = 'eraserOn';
}

eraser.addEventListener('click', eraserActivate);

// colors.js
let colors = ['black', 'grey', 'brown', 'red', 'orange', 'yellow', 'green', 'turquoise', 'lightskyblue', 'blue', 'indigo', 'violet', 'pink'];

for(let i=0, n=colors.length; i<n; i++){
  let swatch = document.createElement('div');
  swatch.className = 'swatch';
  swatch.style.backgroundColor = colors[i];
  swatch.addEventListener('click', setSwatch);
  document.getElementById('colors').appendChild(swatch);
}

function setColor(color){
  ctx2.fillStyle = color;
  ctx2.strokeStyle = color;
  let active = document.getElementsByClassName('active')[0];
  if(active){
    active.className = 'swatch';
  }
}

function setSwatch(e){
  let swatch = e.target; // identify swatch
  setColor(swatch.style.backgroundColor);
  swatch.className += ' active'; // give active class
  eraser.className = ''; // empty the eraser class
}

// initialize color
setSwatch({target: document.getElementsByClassName('swatch')[0]});

// clear.js
let clear = document.getElementById('clear');

function clearCanvas() {
  for(let i = 0, len = canvasWrapper.children.length; i < len; i++) {
    canvasWrapper.children[i].width = canvasWrapper.children[i].width;
    // canvasWrapper.children[i].height = canvasWrapper.children[i].height;
  }
  setRadius(radius);
  setAlpha(alpha);
  if(eraser.className === 'eraserOn'){
    eraserActivate();
  } else {
    setSwatch({target: document.getElementsByClassName('active')[0]});
  }
}

// Order matters. Unless the function is written first, it will not be executed.
clear.addEventListener('click', function(){
  clearCanvas();
  socket.emit('clear', canvas_id);
  // store image for undo
  oldImages.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if(oldImages.length > 10){
    oldImages.shift();
  }
});

socket.on('clear', function(){
  clearCanvas();
  // store image for undo
  oldImages.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if(oldImages.length > 10){
    oldImages.shift();
  }
});

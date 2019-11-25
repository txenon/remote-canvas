const socket = io();
// const socket = io.connect("/", { 'sync disconnect on unload': true });
let isTouch = ('ontouchstart' in window);
let canvasWrapper = document.getElementById('canvasWrapper');
let canvasLength; // width and height

let oldImages = [];
let rotateFlag;
let userCount;
let userCountSpan = document.getElementById("userCountVal");
let msgBox = document.getElementById("msgBox");

function setWindowSize(){
  // know which is longer, width or height
  if (window.innerHeight > window.innerWidth) {
    document.documentElement.style.transform = "rotate(90deg)";
    rotateFlag = true;
    // 回転した後にpositionをwindowの端(右上か左下)に合わせる 必要はある？
    // body size adjust
    document.body.style.width = window.innerHeight + "px";
    document.body.style.height = window.innerWidth + "px";

    canvasLength = window.innerHeight;
    // set size of local window(canvasWrapper div) for overflow hidden
    canvasWrapper.style.width = window.innerHeight + "px";
    canvasWrapper.style.height = window.innerWidth + "px";
  } else {
    document.documentElement.style.transform = "rotate(0)";
    rotateFlag = false;
    document.body.style.width = window.innerWidth + "px";
    document.body.style.height = window.innerHeight + "px";

    canvasLength = window.innerWidth;
    // set size of local window(canvasWrapper div) for overflow hidden
    canvasWrapper.style.width = window.innerWidth + "px";
    canvasWrapper.style.height = window.innerHeight + "px";
  }

  // change size func, when connect, disconnect, window.onresize時
  for(let i = 0, len = canvasWrapper.children.length; i < len; i++) {
    canvasWrapper.children[i].style.width = canvasLength + "px";
    canvasWrapper.children[i].style.height = canvasLength + "px";
  }

  // settingsの初期値を決めておく
  setRadius(radius);
  setAlpha(alpha);
  if(eraser.className === 'eraserOn'){
    eraserActivate();
  } else {
    setSwatch({target: document.getElementsByClassName('active')[0]});
  }
}

// canvasの拡大縮小による劣化抑えるために1920pxに統一してCSSでサイズ変更
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
canvas.width = 1920;
canvas.height = 1920;
let canvas2 = document.getElementById('canvas2');
let ctx2 = canvas2.getContext('2d');
canvas2.width = 1920;
canvas2.height = 1920;
/*
let canvas4 = document.getElementById('canvas4');
let ctx4 = canvas4.getContext('2d');
canvas4.width = 1920;
canvas4.height = 1920;
*/
// 一人だけのときのため サイズは1,2,4を先に設定しておく
// 3のサイズはそれぞれ生成時に設定
// when connect, resize, disconnect(this case, its connect)
// is it better after load canvas 1,2,4 and canvas3?
window.onload = setWindowSize;

// create canvas3

let dragging = false;
let canvas3 = {};
let ctx3 = {};
let mysocketid;
let colorOfBackground = 'white'; // set to canvas4 color
let canvas_id = location.pathname.substr(10);

function createCanvas(id) {
  canvas3[id] = document.createElement('canvas');
  // textは閉じタグつかないバグを防ぐために必要
  canvas3[id].textContent = "Sorry, your browser does not support canvas.";
  canvasWrapper.appendChild(canvas3[id]);
  canvas3[id].id = "canvas3_" + id;
  canvas3[id].style.position = 'absolute';
  canvas3[id].style.left = '0';
  canvas3[id].style.top = '0';
  // zindex考える、重なったとき大丈夫？まあcanvas3だから本質的ではないが。
  canvas3[id].style.zIndex = '2';
  // サイズ設定
  canvas3[id].width = 1920;
  canvas3[id].height = 1920;
  canvas3[id].style.width = canvasLength + "px";
  canvas3[id].style.height = canvasLength + "px";
  ctx3[id] = canvas3[id].getContext('2d');
}

socket.on("connected", function(SocketIdList){
  mysocketid = socket.id.slice(2);

  for(let i = 0; i < SocketIdList[0].length; i++) {
    createCanvas(SocketIdList[0][i].slice(2));
  }
  // ユーザー数表示
  userCount = SocketIdList[1];
  userCountSpan.textContent = userCount;
  // 最初にコネクトしてまだ一人ならばdbから、二人以上ならばその人からデータをもらう
  if(userCount == 1){
    // サーバーから画像をロード
    $.ajax({
      url: location.pathname + "/api",
      type: 'GET',
      dataType: 'json',
      success: function(data) {
        if(data.filename != ""){
          let img = new Image();
          img.src = "/images/" + data.filename;
          console.log(img.src);
          img.onload = function(){
            // 二重描画を防ぐためcanvasをクリア
            canvas.width = canvas.width;
            ctx.drawImage(img, 0, 0);
            oldImages = []; // oldImages初期化
            oldImages.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
          };
        }
      },
      error: (err) => {
        console.log(location.pathname);
      }
    });
  } else {
    // キャンバスデータをほかのユーザーからもらう。ダメなら次々次のユーザーにfetch
  }
});

socket.on("get canvas data", function(socket_id){
  socket.emit("get canvas data", [canvas.toDataURL(), socket_id]);
});

socket.on("render canvas", function(data){
  let img = new Image;
  img.src = data;
  img.onload = function(){
    // 二重描画を防ぐためcanvasをクリア
    canvas.width = canvas.width;
    ctx.drawImage(img, 0, 0);
    // undo時と新規接続時があるがどちらにしてもoldimagesを初期化して、renderしたものをpushすればよい
    oldImages = [];
    oldImages.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  };
});

socket.on('user disconnected', function(data) {
  let id = data.slice(2);
  userCount -= 1;
  userCountSpan.textContent = userCount;
  // AutoSave when all the other users disconnected
  if(userCount == 1){
    saveImageToServer();
    autoSaveCount = 0;
  }
  canvasWrapper.removeChild(canvas3[id]);
  delete canvas3[id];
  delete ctx3[id];
});

// 画面サイズを最大に合わせる、saveするときそれぞれでcrop
let resizeTimer = null;
window.onresize = function(){
  // canvasサイズの共有も課題
  if(canvasLength < window.innerWidth || canvasLength < window.innerHeight) {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      setWindowSize();
    }, 200);
  }
};

window.onorientationchange = function(){
  setWindowSize();
};

// AutoSave
let autoSaveCount = 0;
let autoSaveTimer = null;
/*
window.onbeforeunload = function(){
  // return "ページを離れると、セーブされていないスケッチは失われます。よろしいですか？";
  saveImageToServer();
};
*/

// Drawing

// 外で宣言してみる
let thisX;
let thisY;

function getCursorPosition(x, y){
  if(rotateFlag) {
    thisX = y * 1920 / canvasLength;
    thisY = (parseInt(canvasWrapper.style.height, 10) - x) * 1920 / canvasLength;
  } else {
    thisX = x * 1920 / canvasLength;
    thisY = y * 1920 / canvasLength;
  }
}

function putPoint(e){
  if(dragging){
    e.preventDefault();
    // touchイベントにははoffsetは対応していない
    thisX = e.pageX || e.changedTouches[0].pageX;
    thisY = e.pageY || e.changedTouches[0].pageY;
    // rotate時のカーソル位置変更
    getCursorPosition(thisX, thisY);
    if(eraser.className === 'eraserOn'){
      canvas2.style.opacity = 1;
      ctx2.fillStyle = colorOfBackground;
      ctx2.strokeStyle = colorOfBackground;
    }
    ctx2.lineCap = "round";
    ctx2.lineTo(thisX, thisY);
    ctx2.stroke();
    ctx2.beginPath();
    ctx2.arc(thisX, thisY, radius, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.beginPath();
    ctx2.moveTo(thisX, thisY);

    socket.emit('canvas', [{
      mode: "move",
      socketid: mysocketid,
      x: thisX,
      y: thisY,
      color: ctx2.strokeStyle,
      radius: radius,
      alpha: alpha,
      eraserActivated: eraser.className === 'eraserOn'
    }, canvas_id]);
  }
}

function engage(e){
  e.preventDefault();
  dragging = true;
  putPoint(e);
}

function disengage(){
  if(dragging) {
    if(eraser.className === 'eraserOn') {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalAlpha = alpha / 100;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(canvas2, 0, 0);
    // clear Canvas2
    canvas2.width = canvas2.width;
    setRadius(radius);
    setAlpha(alpha);
    if(eraser.className !== 'eraserOn'){
      setSwatch({target: document.getElementsByClassName('active')[0]});
    }

    socket.emit('canvas', [{
      mode: "up",
      socketid: mysocketid,
      alpha: alpha,
      eraserActivated: eraser.className === 'eraserOn'
    }, canvas_id]);

    // store image for undo
    oldImages.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    while(oldImages.length > 15){
      oldImages.shift();
    }

    // For Microsoft Edge, Clear the previous putPoint
    ctx2.beginPath();

    // AutoSave
    /*
    if(autoSaveCount < 15){
      autoSaveCount += 1;
    } else {
      saveImageToServer();
      autoSaveCount = 0;
    }
    */

    /*
    一人の時、最後に操作してから何秒か経過したら保存か、何回操作したら保存か、
    誰かユーザーがdisconnectしたときに保存
    キャンバスの削除も選択して削除
    */

    if(autoSaveCount < 5){
      autoSaveCount += 1;
    } else if(autoSaveCount < 15) {
      autoSaveCount += 1;
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(function() {
        saveImageToServer();
        autoSaveCount = 0;
      }, 300000 / autoSaveCount);
    } else {
      saveImageToServer();
      autoSaveCount = 0;
    }
  }
  // mouseleaveでdisengageを二度発生させないためにdraggingとの順序大事。
  dragging = false;
}

canvas2.addEventListener('touchstart', engage, false);
canvas2.addEventListener('touchmove', putPoint, false);
canvas2.addEventListener('touchend', disengage, false);

canvas2.addEventListener('mousedown', engage, false);
canvas2.addEventListener('mousemove', putPoint, false);
canvas2.addEventListener('mouseup', disengage, false);
canvas2.addEventListener('mouseleave', disengage, false);

// グローバル宣言
let ctxToDraw;
let canvasToDraw;

socket.on('canvas', function(data){
  ctxToDraw = ctx3[data.socketid];
  canvasToDraw = canvas3[data.socketid];
  if(data.mode === "move") {
    // スタイルの適用
    ctxToDraw.lineWidth = data.radius * 2;
    if(data.eraserActivated) {
      canvasToDraw.style.opacity = 1;
      ctxToDraw.fillStyle = colorOfBackground;
      ctxToDraw.strokeStyle = colorOfBackground;
    } else {
      canvasToDraw.style.opacity = data.alpha / 100;
      ctxToDraw.strokeStyle = data.color;
      ctxToDraw.fillStyle = data.color;
    }

    ctxToDraw.lineCap = "round";
    ctxToDraw.lineTo(data.x, data.y);
    ctxToDraw.stroke();
    ctxToDraw.beginPath();
    ctxToDraw.arc(data.x, data.y, data.radius, 0, Math.PI * 2);
    ctxToDraw.fill();
    ctxToDraw.beginPath();
    ctxToDraw.moveTo(data.x, data.y);
  } else {
    if(data.eraserActivated) {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalAlpha = data.alpha / 100;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(canvasToDraw, 0, 0);
    canvasToDraw.width = canvasToDraw.width; // clear canvasToDraw

    // store image for undo
    oldImages.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    while(oldImages.length > 15){
      oldImages.shift();
    }

    // For Microsoft Edge, Clear the previous putPoint
    ctxToDraw.beginPath();
  }
});

let undo = document.getElementById('undo');
undo.addEventListener('click', function() {
  if(oldImages.length > 1) {
    socket.emit('undo', canvas_id);
    ctx.putImageData(oldImages[oldImages.length - 2], 0, 0);
    oldImages.pop();
  }
});
socket.on('undo', function(undoSocket){
  if(oldImages.length > 1) {
    ctx.putImageData(oldImages[oldImages.length - 2], 0, 0);
    oldImages.pop();
  } else {
    socket.emit("fetch canvas data", undoSocket);
  }
});

socket.on("msgBox", function(msg){
  console.log(msg);
  $("#msgBox").hide();
  msgBox.textContent = msg;
	$("#msgBox").fadeIn(2000);
  setTimeout(function(){
    $("#msgBox").fadeOut(2000);
    setTimeout(function(){
      msgBox.textContent = "";
    }, 2000);
  }, 3000);
});

function saveImageToServer() {
  socket.emit("save image to server", [canvas.toDataURL(), location.pathname.substr(10)]);
}

socket.on("redirect", (destination) => {
  window.location.href = destination;
});

var saveButton = document.getElementById('save');

saveButton.addEventListener('click', saveImage);

function cropAndSendImageToClient() {
  var tempCanvas = document.createElement('canvas');
  tempCanvas.textContent = "Sorry, your browser does not support canvas.";
  // for firefox you have to actually append it, maybe?
  canvasWrapper.appendChild(tempCanvas);
  // crop
  /*
  tempCanvas.width = parseInt(canvasWrapper.style.width, 10);
  tempCanvas.height = parseInt(canvasWrapper.style.height, 10);
  var tempCtx = tempCanvas.getContext('2d');
  tempCtx.scale(tempCanvas.width / 1920, tempCanvas.width / 1920);
  */
  tempCanvas.width = 1920;
  tempCanvas.height = Math.floor(1920 * parseInt(canvasWrapper.style.height, 10) / parseInt(canvasWrapper.style.width, 10));
  var tempCtx = tempCanvas.getContext('2d');
  // tempCtx.drawImage(canvas4, 0, 0); // Composite background color
  tempCtx.drawImage(canvas, 0, 0);
  // Save
  var data = tempCanvas.toDataURL();
  canvasWrapper.removeChild(tempCanvas);
  window.open(data, '_blank');
}

function saveImageToServer() {
  socket.emit("save image to server", [canvas.toDataURL(), location.pathname.substr(10)]);
}

function saveImage(){
  cropAndSendImageToClient();
  saveImageToServer();
  /*
  $.ajax({
    url: location.pathname,
    type: 'PUT',
    dataType: 'json',
    data: { 'dataurl' : canvas.toDataURL() },
    success: function(data) {
      alert("success!!");
    }
  });
  */
}

/*
socket.on("download image", function(filepath) {
  var link = document.createElement('a');
  link.href = filepath;
  link.download = filepath.substr(7);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});
*/

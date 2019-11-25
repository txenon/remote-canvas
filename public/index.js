var newCanvasButton = document.getElementsByClassName("newCanvas");

for (var i = 0; i < newCanvasButton.length; i++) {
  newCanvasButton[i].addEventListener('click', newCanvasFunction, false);
}

function newCanvasFunction(){
  $.ajax({
    url: "/canvases",
    type: 'POST',
    dataType: 'json',
    data: {},
    success: function(canvas) {
      window.location.href = "/canvases/"+canvas._id;
    }
  });
}

var deleteButton = document.getElementsByClassName("deleteCanvas");

function deleteCanvasFunction(){
  var canvas_id = $(this).attr("alt");
  $.ajax({
    url: "canvases/" + canvas_id,
    type: 'DELETE',
    dataType: 'json',
    data: {},
    success: function(canvas) {
      $("#card-" + canvas_id).remove();
    }
  });
}

for (var i = 0; i < deleteButton.length; i++) {
  deleteButton[i].addEventListener('click', deleteCanvasFunction, false);
}

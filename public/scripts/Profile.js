function preview() {
        imagePreview.src=URL.createObjectURL(event.target.files[0]);
        const filesize = ((event.target.files[0].size/1024)/1024).toFixed(4); 
        if(filesize > 5){
              $('#Message').css('color','var(--dark-red)');
              $('#statImage').attr('class','fa fa-times');
              $('#UploadImage').prop('disabled',true);
        }else{
              $('#Message').css('color','var(--theme-green)');
              $('#statImage').attr('class','fa fa-check-circle');
              $('#UploadImage').prop('disabled',false);
        }
}

function preview2() {
      imagePreview.src=URL.createObjectURL(event.target.files[0]);
      const filesize = ((event.target.files[0].size/1024)/1024).toFixed(4); 
      if(filesize > 5){
            $('#Message1').css('color','var(--dark-red)');
            $('#statDoc1').attr('class','fa fa-times');
            $('#nUploadBtn').prop('disabled',true);
      }else{
            $('#Message1').css('color','var(--theme-green)');
            $('#statDoc1').attr('class','fa fa-check-circle');
            $('#nUploadBtn').prop('disabled',false);
      }
}

function preview3() {
      imagePreview.src=URL.createObjectURL(event.target.files[0]);
      const filesize = ((event.target.files[0].size/1024)/1024).toFixed(4); 
      if(filesize > 5){
            $('#Message2').css('color','var(--dark-red)');
            $('#statDoc2').attr('class','fa fa-times');
            $('#nUploadBtn').prop('disabled',true);
      }else{
            $('#Message2').css('color','var(--theme-green)');
            $('#statDoc2').attr('class','fa fa-check-circle');
            $('#nUploadBtn').prop('disabled',false);
      }
}
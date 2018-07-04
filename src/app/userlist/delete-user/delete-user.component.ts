import { Component, OnInit } from '@angular/core';
import { CDSService } from '../../../services/httpAPI.service';
import { SharedService } from '../../../services/shared.service';
import { ResponseData, ErrorResponse } from '../../../models/response';
import { UserListResponse, UserTableData } from '../../../models/user';

@Component({
  selector: 'app-delete-user',
  templateUrl: './delete-user.component.html',
  styleUrls: ['./delete-user.component.css']
})
export class DeleteUserComponent implements OnInit {
	modalTitle : string = '';
  message : string = '';
  userList:UserTableData[]=[];
  response:ResponseData;
  errorResponse:ErrorResponse;
  oneUserSelectedDelete:boolean=false;
  moreUserSelectedDelete:boolean=false;
  user:any={
    refresh:false,
    userList:this.userList,
    action:''
  };
  username : any;
  constructor(private apiData: CDSService, private sharedService:SharedService) { }

  ngOnInit() {
    let view = this;
    this.sharedService.deleteUserList.subscribe(function(val){
      view.userList=val;
      view.validateUserList();
    });
  }

  validateUserList(){
    let view=this;
    if (view.userList.length == 1) {
      view.oneUserSelectedDelete=true;
      view.moreUserSelectedDelete=false;
    } else if ((view.userList.length==0) || view.userList.length>1) {
      view.oneUserSelectedDelete=false;
      view.moreUserSelectedDelete=true;
    }
    //view.userList.length = 0;
  }

  deleteUserDetails(){
    let view = this;
    view.username=view.userList[0].username;
    view.apiData.deleteUser(view.username).subscribe(function(val){
      view.response = val;
      if (view.response.success) {
        view.modalTitle = 'Success';
        view.message = val.message;
        $("#deleteUserModal .close").click();
        view.user.refresh = true;
        view.user.action='refresh';
        view.sharedService.userDataTransfer(view.user);
        view.cancelDeleteUserDetails();
      } 
      else {
        view.modalTitle = 'Error';
        view.message = val.message;
      }
    },function(err){
      view.errorResponse = err;
          $('.modal-backdrop').hide();
      if (view.errorResponse.message.includes('Session')) {
        view.sharedService.logout(true);
      } else {
        view.modalTitle = view.errorResponse.title;
        view.message = view.errorResponse.message;
        $('#modelAlertUser').modal('show');
      }
    });
    $('#modalAlertUserDelete').modal('show');
  }
  
  cancelDeleteUserDetails(){
    $('#deleteUserModal .close').click();
  }

  onOk(){
    $('#modalAlertUserDelete .close').click();
  }

}

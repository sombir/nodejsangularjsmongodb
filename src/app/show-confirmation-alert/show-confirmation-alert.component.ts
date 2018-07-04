import { Component, OnInit, Input } from '@angular/core';
import { CDSService } from '../../services/httpAPI.service';
import {CookieService} from 'angular2-cookie/core';
import { Router, NavigationEnd, ActivatedRoute, Params } from '@angular/router'; 

@Component({
	selector: 'app-show-confirmation-alert',
	templateUrl: './show-confirmation-alert.component.html',
	styleUrls: ['./show-confirmation-alert.component.css'],
	providers:[CDSService]
})
export class ShowConfirmationAlertComponent implements OnInit {
	@Input('title') title = "";
	@Input('message') message = "";
	constructor(private router: Router, private _cookieService:CookieService, private apiService : CDSService) {
	}

	ngOnInit() {
		console.log(this.title);
		console.log(this.message);
		if (this.title.includes('Logout')) {
			$('#closepopupBtn').show();
		} else {
			$('#closepopupBtn').hide();
		}
		$('#openpopup').click();
	}

	close(){
		$('#confirmationModal .close').click();	
	}

	ok(){
		if (this.title.includes('Logout')) {
			this._cookieService.remove('TOKEN');
			this.router.navigate(['login']);  
		} 
		$('#confirmationModal .close').click();	

	}

}

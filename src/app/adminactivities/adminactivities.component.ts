import { Component, OnInit, ViewChild, ComponentFactoryResolver, ViewContainerRef } from '@angular/core';
import { ActivitiestableComponent } from './activitiestable/activitiestable.component';
// import {HttpClient, HttpHeaders, HttpResponse, HttpParams} from '@angular/common/http';

@Component({
	selector: 'app-adminactivities',
	templateUrl: './adminactivities.component.html',
	styleUrls: ['./adminactivities.component.css']
})
export class AdminactivitiesComponent implements OnInit {

	@ViewChild('activityTable', { read: ViewContainerRef }) activityTable: ViewContainerRef;
	selectedText:string='';

	constructor(private componentFactoryResolver: ComponentFactoryResolver) { }

	ngOnInit() {
		$('body').css('background-color', '#D9E0E7');
		this.itemClicked();
		// $('#SelectedItem').click();
		// this.selectedText=$('#SelectedItem').text();
	}

	itemClicked(){
		/*if ($('#SelectedItem').css("background-color")=="rgb(191, 210, 229)") {
			$('#SelectedItem').css('background-color','#ffffff');
		} else {*/
			const componentFactory = this.componentFactoryResolver.resolveComponentFactory(ActivitiestableComponent);
			this.activityTable.clear();
			const dyynamicComponent = <ActivitiestableComponent>this.activityTable.createComponent(componentFactory).instance;
			// dyynamicComponent.queryString = $('#SelectedItem').text();
			// dyynamicComponent.queryString = 'System';
			// $('#SelectedItem').css('background-color','#BFD2E5');
		// }

	}

	

}

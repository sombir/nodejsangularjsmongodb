import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CDSService } from '../../services/httpAPI.service';
import { Chart } from 'chart.js';
import * as _ from 'lodash';
import { ClusterListData, ClusterData, ZonesData } from '../../models/cluster';
import { ApListResponse, ApDataArray } from '../../models/ap';
import { ResponseData, ErrorResponse } from '../../models/response';
import { SharedService } from '../../services/shared.service';
import { Router } from '@angular/router';
@Component({
	selector: 'home',
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit  {
	@ViewChild('doughnutAPState') doughnutAPState: ElementRef;
	@ViewChild('doughnutCPState') doughnutCPState: ElementRef;
	@ViewChild('doughnutDPState') doughnutDPState: ElementRef;
	@ViewChild('doughnutAPModels') doughnutAPModels: ElementRef;
	@ViewChild('doughnutCRState') doughnutCRState: ElementRef;
	@ViewChild('doughnutOSType') doughnutOSType: ElementRef;
	@ViewChild('doughnutAPProvision') doughnutAPProvision: ElementRef;
	@ViewChild('doughnutAPModelDistribution') doughnutAPModelDistribution: ElementRef;
	@ViewChild('gaugeLicenseState') gaugeLicenseState: ElementRef;
	@ViewChild('barAPLicenseUsed') barAPLicenseUsed: ElementRef;
	@ViewChild('bubbleChart') bubbleChart: ElementRef;
	@ViewChild('barAPModels') barAPModels: ElementRef;
	@ViewChild('barClusterAPCount') barClusterAPCount: ElementRef;
	@ViewChild('barClusterClientCount') barClusterClientCount: ElementRef;
	@ViewChild('barClusterAPErrors') barClusterAPErrors: ElementRef;
	@ViewChild('APDiscoveryTrends') APDiscoveryTrends: ElementRef;
	@ViewChild('APDeploymentTrends') APDeploymentTrends: ElementRef;
	@ViewChild('chart') el: ElementRef;

	public context: CanvasRenderingContext2D;
	clusterListData : ClusterListData = new ClusterListData(0, false, []);
	clusterList : ClusterData[] = [];
	zoneList : ZonesData[]=[];
	apListData : ApListResponse = new ApListResponse(0, false, []);
	apList : ApDataArray[]=[];
	errorResponse: ErrorResponse;
	graphList = [];
	graphListClusters = [];
	graphListAPModels = [];
	clusterName : Array<string> = [];
	APCountArray : Array<any> = [];
	sortedArrayAP : Array<any> = [];
	sortedapTotal =[];
	sortedClusterClients = [];
	sortedClusterClientArray : Array<any> = [];
	clusterClients = [];
	clusterNameAP : Array<string> = [];
	noofAPInCluster : Array<number> = [];
	apInZone : Array<number> = [];
	zoneName : Array<string> = [];
	apName : Array<string> = [];
	apOnline = [];
	apOffline = [];
	apFlagged = [];
	apTotal = [];
	APLicenseUsed = [];
	APLicenseTotal = [];
	sortedAPLicenseUsed = [];
	sortedAPLicenseTotal = [];
	clusterAPLicenseUsed = [];
	osName : Array<string> = [];
	osCount : Array<string> = [];
	update : {width, height} = {width:0,height:0};
	gaugeUpdate : {width, height, margin} = {width:0,height:0,margin: {l: 0,r: 0,b: 0,t: 0,pad: 20}};
	chartTitleFontSize : number = 16;
	chartTitleFontColor : any = '#8f99a4';
	chartAnnotationFontSize : number = 12;
	chartAnnotationFontColor : any = '#9A9B9C';
	d3 : any = Plotly.d3;
	gdBarAPModels : any;
	gdGaugeLicenseState : any;	
	gdBubbleChart : any;

	gdDoughnutCRState :any;
	gdDoughnutCPState : any;
	gdDoughnutDPState : any;
	gdBarClusterAPErrors:any;
	gdDoughnutAPState : any;
	gdDoughnutAPProvision:any;
	gdBarClusterAPCount : any;
	gdBarClusterClientCount : any;
	gdBarAPLicenseUsage : any;
	gdDoughnutOSType : any;
	gdDoughnutAPModels : any;
	gdDoughnutAPModelDistribution:any;

	graphListData : any;
	no_of_clusters : any;
	no_of_clients : any;
	no_of_aps : any;
	no_of_cps : any;
	no_of_dps : any;
	no_of_apmodels : any;
	apState_online :any;
	apState_offline :any;
	apState_flagged :any;
	cpState_online :any;
	cpState_offline :any;
	cpState_flagged :any;
	dpState_online :any;
	dpState_offline :any;
	dpState_flagged :any;
	crState_online :any;
	crState_offline :any;
	crState_flagged :any;
	consumedLicenseStates :any;
	no_of_os :any;
	clusterClientsName = [];
	sortedAPLicenseUsedName = [];
	sortedAPLicenseUsedVal = [];
	clusterClientsNumber = [];
	clusterAPName = [];
	clusterAPOnline = [];
	clusterAPOffline = [];
	clusterAPFlagged = [];
	apModelName = [];
	apModelTotal = [];
	apNameDist = [];
	apCountDist = [];
	importedAPState : any;
	provisionedAPState : any;
	totalAPProvision : any;
	apError = [];
	sortedAPError = [];
	clusterAPErrorName = [];
	clusterAPErrorFlagged = [];
	clusterAPErrorOffline = [];
	totcrStates : any;
	modelTitle: String = '';
	modelMessage: String = '';

	constructor(private router: Router,private apiData : CDSService, private changeDetector: ChangeDetectorRef, private sharedService:SharedService){
		let view = this;
	}

	ngOnInit() {
		let view = this;
		$('body').css('background-color', '#D9E0E7');
		$('#overlay').show();
		if ($(window).width() > 1455) {
			view.update.width = 400;
			view.update.height = 400;
			view.gaugeUpdate.width = 130;
			view.gaugeUpdate.height = 130;
			if ($(window).width() < 1490) {
				view.gaugeUpdate.width = 130;
				view.gaugeUpdate.height = 130;
				view.gaugeUpdate.margin.r = 15;
				view.gaugeUpdate.margin.t = 15;
				view.gaugeUpdate.margin.b = 15;
				view.gaugeUpdate.margin.l = 15;
			}
		} else if ($(window).width() < 1455 && $(window).width() > 965) {
			view.update.width = 300;
			view.update.height = 300;
			view.gaugeUpdate.width = 130;
			view.gaugeUpdate.height = 130;
			if ($(window).width() < 1300) {
				view.gaugeUpdate.width = 130;
				view.gaugeUpdate.height = 130;
				view.gaugeUpdate.margin.r = 15;
				view.gaugeUpdate.margin.t = 15;
				view.gaugeUpdate.margin.b = 15;
				view.gaugeUpdate.margin.l = 15;
			}
			if ($(window).width() < 1200) {
				view.gaugeUpdate.width = 130;
				view.gaugeUpdate.height = 130;
				view.gaugeUpdate.margin.r = 15;
				view.gaugeUpdate.margin.t = 15;
				view.gaugeUpdate.margin.b = 15;
				view.gaugeUpdate.margin.l = 15;
			}
			if ($(window).width() < 1145) {
				view.gaugeUpdate.margin.r = 0;
				view.gaugeUpdate.margin.t = 0;
				view.update.width = 250;
				view.update.height = 250;
				view.gaugeUpdate.width = 130;
				view.gaugeUpdate.height = 130;
				if ($(window).width() < 1080) {
					view.gaugeUpdate.margin.r = 15;
					view.gaugeUpdate.margin.t = 15;
					view.gaugeUpdate.margin.b = 15;
					view.gaugeUpdate.margin.l = 15;
				}
			}

			if ($(window).width() > 1000 && $(window).width() < 1025) {
				view.update.width = 240;
				view.update.height = 250;
				view.gaugeUpdate.width = 130;
				view.gaugeUpdate.height = 130;
			}

			if ($(window).width() < 1000) {
				view.update.width = 200;
				view.update.height = 200;
				view.gaugeUpdate.margin.r = 15;
				view.gaugeUpdate.margin.t = 15;
				view.gaugeUpdate.margin.b = 15;
				view.gaugeUpdate.margin.l = 15;
			}
		} else if ($(window).width() < 965 && $(window).width() > 850) {
			view.update.width = 400;
			view.update.height = 400;
			view.gaugeUpdate.width = 160;
			view.gaugeUpdate.height = 160;
			view.gaugeUpdate.margin.r = 30;
			view.gaugeUpdate.margin.b = 30;
			view.gaugeUpdate.margin.l = 30;
		} else if ($(window).width() < 850 && $(window).width() > 750) {
			view.update.width = 300;
			view.update.height = 300;
			view.gaugeUpdate.width = 160;
			view.gaugeUpdate.height = 160;
			view.gaugeUpdate.margin.r = 30;
			view.gaugeUpdate.margin.b = 30;
			view.gaugeUpdate.margin.l = 30;
		} else if ($(window).width() < 750 && $(window).width() > 426) {
			view.update.width = 380;
			view.update.height = 400;
			view.gaugeUpdate.width = 160;
			view.gaugeUpdate.height = 160;
			view.gaugeUpdate.margin.r = 30;
			view.gaugeUpdate.margin.b = 30;
			view.gaugeUpdate.margin.l = 30;
		} else if ($(window).width() < 426) {
			view.update.width = 290;
			view.update.height = 400;
			view.gaugeUpdate.width = 160;
			view.gaugeUpdate.height = 160;
			view.gaugeUpdate.margin.r = 30;
			view.gaugeUpdate.margin.b = 30;
			view.gaugeUpdate.margin.l = 30;
		}

		view.apiData.cdsGraphService().subscribe(function(val){
			if(val.success){
				view.graphListData = val;
				view.graphList = view.graphListData.stats;
				view.graphListClusters = view.graphListData.stats.clusters;
				view.graphListAPModels = view.graphListData.stats.apModels;
				for(let cluster of view.graphListClusters){
					let newName2 = {
						clients: cluster.client,
						name : cluster.clusterName 
					};
					view.clusterClients.push(newName2);
				}

				view.sortedClusterClients = view.clusterClients.sort(function(a, b){
					return a.clients == b.clients ? 0 : +(a.clients < b.clients) || -1;
				});

				for(let ap of view.graphListAPModels){
					view.apName.push(ap.apModel);
					view.apOnline.push(ap.apOnline);
					view.apOffline.push(ap.apOffline);
					view.apFlagged.push(ap.apFlagged);
					let newName1 = {
						total:(ap.apFlagged + ap.apOffline + ap.apOnline),
						apModel : ap.apModel 
					};
					view.apTotal.push(newName1);
				}

				for(let i = 0 ; i < view.graphListAPModels.length ; i++){
					view.apNameDist[i] = view.apTotal[i].apModel;
					view.apCountDist[i] = view.apTotal[i].total;
				}
				view.sortedapTotal = view.apTotal.sort(function(a, b){
					return a.total == b.total ? 0 : +(a.total < b.total) || -1;
				});
				console.log("TOP 5 AP Models",view.sortedapTotal);

				view.no_of_clusters = view.graphListData.stats.totalClusters;
			//view.no_of_aps = view.graphListData.stats.totalZones;
			view.no_of_clients = view.graphListData.stats.totalClients;
			view.apState_online = view.graphListData.stats.apState.online;
			view.apState_offline = view.graphListData.stats.apState.offline;
			view.apState_flagged = view.graphListData.stats.apState.flagged;
			view.no_of_aps = view.graphListData.stats.apState.online + view.graphListData.stats.apState.offline + view.graphListData.stats.apState.flagged;
			view.cpState_online = view.graphListData.stats.cpState.online;
			view.cpState_offline = view.graphListData.stats.cpState.offline;
			view.cpState_flagged = view.graphListData.stats.cpState.flagged;
			view.dpState_online = view.graphListData.stats.dpState.online;
			view.dpState_offline = view.graphListData.stats.dpState.offline;
			view.dpState_flagged = view.graphListData.stats.dpState.flagged;
			view.no_of_apmodels = view.graphListData.stats.apModels.length;
			view.no_of_os = view.graphListData.stats.osTypes.length;
			view.crState_online = view.graphListData.stats.clusterState.online;
			view.crState_offline = view.graphListData.stats.clusterState.offline;
			view.crState_flagged = view.graphListData.stats.clusterState.flagged;
			view.totcrStates = view.crState_online + view.crState_offline + view.crState_flagged;
			view.importedAPState = view.graphListData.stats.provisionAPState.imported;
			view.provisionedAPState = view.graphListData.stats.provisionAPState.provisioned;
			view.totalAPProvision = view.importedAPState + view.provisionedAPState;
			console.log(view.graphListData.stats);

			//finding value to move needle of License states
			view.consumedLicenseStates = ((((view.graphListData.stats.licenseState.consumed/view.graphListData.stats.licenseState.total))*100).toFixed(0));

			for(let i=0; i< view.graphListData.stats.clusters.length; i++){
				let newName = {
					total:(view.graphListData.stats.clusters[i].apOnline + view.graphListData.stats.clusters[i].apFlagged + view.graphListData.stats.clusters[i].apOffline),
					name : view.graphListData.stats.clusters[i].clusterName ,
					Online : view.graphListData.stats.clusters[i].apOnline,
					Offline : view.graphListData.stats.clusters[i].apOffline,
					Flagged : view.graphListData.stats.clusters[i].apFlagged
				};
				let newNameLic = {
					total: view.graphListData.stats.clusters[i].apLicenseConsumed ? ((view.graphListData.stats.clusters[i].apLicenseConsumed)/(view.graphListData.stats.clusters[i].apLicenseTotal)*100).toFixed(2) : 0,
					name : view.graphListData.stats.clusters[i].clusterName
				};
				view.APCountArray.push(newName);
				view.APLicenseUsed.push(newNameLic);
				view.APLicenseTotal.push(view.graphListData.stats.clusters[i].apLicenseTotal);
			}
			
			view.sortedAPLicenseUsed = view.APLicenseUsed.sort(function(a, b){
				return b.total - a.total;
			});

			for(let i=0; i< view.graphListData.stats.osTypes.length; i++){
				view.osName[i]=view.graphListData.stats.osTypes[i].osType;
				view.osCount[i]=view.graphListData.stats.osTypes[i].count;
			}

			//sorting the clusters wrt APCount
			view.sortedArrayAP = view.APCountArray.sort(function(a, b){
				return a.total == b.total ? 0 : +(a.total < b.total) || -1;
			});

			//For Clusters with AP Errors
			for(let cluster of view.graphListClusters){
				let newName1 = {
					error:(cluster.apFlagged + cluster.apOffline),
					errorFlagged:cluster.apFlagged,
					errorOffline:cluster.apOffline,
					name : cluster.clusterName 
				};
				view.apError.push(newName1);
			}

			view.sortedAPError = view.apError.sort(function(a, b){
				return a.error == b.error ? 0 : +(a.error < b.error) || -1;
			});
			//console.log("AP Error-->" , view.apError);
			$('#overlay').hide();
			view.showGaugeLicenseState();
			view.showDoughnutChartCRStates();
			view.showDoughnutChartCPStates();
			view.showDoughnutChartDPStates();
			view.showBarClusterAPErrors();
			view.showDoughnutChartAPStates();
			view.showDoughnutChartAPProvision();
			view.showBarClusterAPCount();
			view.showBarClusterClientCount();
			view.showBarAPLicenseUsed();
			view.showDoughnutChartOSType();
			view.showDoughnutChartAPModels();
			view.showDoughnutChartAPModelDistribution();
			//view.showAPDeploymentTrends();
			//view.showAPDiscoveryTrends();
			//view.showBarAPModels();
			//view.showBubbleChart();
		}else{
			$('#overlay').hide();
			if(val.message == 'No Cluster Found')
				view.modelTitle = 'Alert';
			else{
				view.modelTitle = 'Error';
			}
			view.modelMessage = val.message;
			$('#homeModelDialog').modal('show');
				// alert(val.message);
			}
		},function(err){
			view.errorResponse = err;

			if (view.errorResponse.message.includes('Session')) {
				view.sharedService.logout(true);
			} else {
				view.modelTitle= view.errorResponse.title;
				view.modelMessage = view.errorResponse.message;
				jQuery('#homeModelDialog').modal('show');
			}
		});
}

goToAPList(){
	localStorage.setItem("openAPList", 'APList');
	this.router.navigate(['/dashboard/inventory']);
}

showBarAPModels(){
	let view = this;
	const element = view.barAPModels.nativeElement;
	let gd3 = view.d3.select(element);
	view.gdBarAPModels = gd3.node();
	var trace1 = {
		x: view.apName,
		y: view.apOnline,
		name: 'Online',
		type: 'bar',
		marker: {
			color : '#A5C8E1'
		}
	};

	var trace2 = {
		x: view.apName,
		y: view.apOffline,
		name: 'Offline',
		type: 'bar',
		marker: {
			color : '#941950'
		}
	};

	var trace3 = {
		x: view.apName,
		y: view.apFlagged,
		name: 'Flagged',
		type: 'bar',
		marker: {
			color : '#E8AB5F'
		}
	};

	var data = [trace1,trace2,trace3];

	let layout = {
		title : '<b>AP Models</b>',
		titlefont : {
			family : 'Arial',
			size : view.chartTitleFontSize,
			color  : view.chartTitleFontColor
		},
		width : view.update.width,
		height : view.update.height,
		font: {
			size: 10
		},
		yaxis: {
			tickangle: 45
		},
		margin: {
			l	:	40,
			r	:	40,
			t	:	75,
			b	:	40,
			pad	:	0,
			autoexpand	:	false
		},
		showlegend:false,
		barmode: 'stack',
		autosize : true,
		paper_bgcolor : '#ffffff',
		plot_bgcolor :  '#f0f0f0'
	};

	Plotly.plot( element, data, layout, {displaylogo: false, displayModeBar: false} );
}

showDoughnutChartCRStates(){
	let view = this;
	const element = view.doughnutCRState.nativeElement;
	let gd3 = view.d3.select(element);
	let displayText = "";
	view.gdDoughnutCRState = gd3.node();
	const data = [{
		values: [view.crState_online,view.crState_offline,view.crState_flagged],
		labels: ["Online", "Offline","Flagged"],
		name: 'Clusters',
		legend : {
			orientation : 'h',
			showlegend : true,
			font : {
				size : 8
			},
			x : 0,
			y : 0
		},
		hoverinfo: 'label+value',
		textinfo : 'none',
		marker: {
			colors: ['#A5C8E1','#941950', '#E8AB5F']
		}, 
		pull: 0,
		hole: 0.6,
		type: 'pie'
	}];
	if (view.totcrStates > 0) {
		displayText = '<b>Total</b><br><br><span style = "color:#797979;font-weight:bold;font-size:22px;">' + view.totcrStates +'</span>';
	} else {
		displayText = '<b>No Data Available</b>'
	}
	let layout = {
		title: '<b>Cluster Service States</b>',
		titlefont : {
			family : 'Arial',
			size : view.chartTitleFontSize,
			color  : view.chartTitleFontColor
		},
		autosize : true,
		width : view.update.width,
		height : view.update.height,
		margin: {
			l	:	40,
			r	:	40,
			t	:	75,
			b	:	40,
			pad	:	0,
			autoexpand	:	false
		},
		showlegend:false,
		annotations: [
		{
			font: {
				family : 'Arial',
				size: view.chartAnnotationFontSize,
				color : view.chartAnnotationFontColor
			},
			showarrow: false,
			text: displayText,
			x: 0.5,
			y: 0.5
		}
		],
		paper_bgcolor : '#ffffff'
	};

	Plotly.plot( element, data, layout, {displaylogo: false, displayModeBar: false});
}

showDoughnutChartCPStates(){
	let view = this;
	const element = view.doughnutCPState.nativeElement;
	let gd3 = view.d3.select(element);
	view.gdDoughnutCPState = gd3.node();
	let displayText = "";
	const data = [{
		values: [view.cpState_online, view.cpState_offline, view.cpState_flagged],
		labels: ["Online", "Offline","Flagged"],
		name: 'Clusters',
		legend : {
			orientation : 'h',
			showlegend : true,
			font : {
				size : 8
			},
			x : 0,
			y : 0
		},
		hoverinfo: 'label+value',
		textinfo : 'none',
		marker: {
			colors: ['#A5C8E1', '#941950','#E8AB5F', '#AC6BCA', '#B56B8e', 'F8A35F']
		}, 
		pull: 0,
		hole: 0.6,
		type: 'pie'
	}];

	if (view.cpState_online > 0) {
		displayText = '<b>Total</b><br><br><span style = "color:#797979;font-weight:bold;font-size:22px;">' + view.cpState_online +'</span>';
	} else {
		displayText = '<b>No Data Available</b>'
	}

	let layout = {
		title: '<b>Control Plane States</b>',
		titlefont : {
			family : 'Arial',
			size : view.chartTitleFontSize,
			color  : view.chartTitleFontColor
		},
		autosize : true,
		width : view.update.width,
		height : view.update.height,
		margin: {
			l	:	40,
			r	:	40,
			t	:	75,
			b	:	40,
			pad	:	0,
			autoexpand	:	false
		},
		showlegend:false,
		annotations: [
		{
			font: {
				family : 'Arial',
				size: view.chartAnnotationFontSize,
				color : view.chartAnnotationFontColor
			},
			showarrow: false,
			text: displayText,
			x: 0.5,
			y: 0.5
		}
		],
		paper_bgcolor : '#ffffff'
	};

	Plotly.plot( element, data, layout, {displaylogo: false, displayModeBar: false});
}

showDoughnutChartDPStates(){
	let view = this;
	const element = view.doughnutDPState.nativeElement;
	let gd3 = view.d3.select(element);
	let displayText = "";
	view.gdDoughnutDPState = gd3.node();
	const data = [{
		values: [view.dpState_online, view.dpState_offline, view.dpState_flagged],
		labels: ["Online", "Offline","Flagged"],
		name: 'Clusters',
		legend : {
			orientation : 'h',
			showlegend : true,
			font : {
				size : 8
			},
			x : 0,
			y : 0
		},
		hoverinfo: 'label+value',
		textinfo : 'none',
		marker: {
			colors: ['#A5C8E1','#941950', '#E8AB5F', '#AC6BCA', '#B56B8e', 'F8A35F']
		}, 
		pull: 0,
		hole: 0.6,
		type: 'pie'
	}];

	if (view.dpState_online > 0) {
		displayText = '<b>Total</b><br><br><span style = "color:#797979;font-weight:bold;font-size:22px;">' + view.dpState_online +'</span>';
	} else {
		displayText = '<b>No Data Available</b>'
	}

	let layout = {
		title: '<b>Data Plane States</b>',
		titlefont : {
			family : 'Arial',
			size : view.chartTitleFontSize,
			color  : view.chartTitleFontColor
		},
		autosize : true,
		width : view.update.width,
		height : view.update.height,
		margin: {
			l	:	40,
			r	:	40,
			t	:	75,
			b	:	40,
			pad	:	0,
			autoexpand	:	false
		},
		showlegend:false,
		annotations: [
		{
			font: {
				family : 'Arial',
				size: view.chartAnnotationFontSize,
				color : view.chartAnnotationFontColor
			},
			showarrow: false,
			text: displayText,
			x: 0.5,
			y: 0.5
		}
		],
		paper_bgcolor : '#ffffff'
	};

	Plotly.plot( element, data, layout, {displaylogo: false, displayModeBar: false});
}

showBarClusterAPErrors(){
	let view = this;
	const element = view.barClusterAPErrors.nativeElement;
	let gd3 = view.d3.select(element);
	view.gdBarClusterAPErrors = gd3.node();
	let isData = false;
	let largest = 0;
	let greyBG = [];
	let length  = view.sortedAPError.length;
	let displayText = "";
	if(length > 5){
		length = 5;
	}
	let barGapValue = 0.2
	if (length > 5) {
		length = 5;
	}
	if (length == 1) {
		barGapValue = 0.4
	}
	if (length == 2) {
		barGapValue = 0.4
	}
	if (length == 3) {
		barGapValue = 0.4
	}
	if (length == 4) {
		barGapValue = 0.3
	}
	for(let i = 0 ; i < length ; i++){
		view.clusterAPErrorName[i] = view.sortedAPError[i].name;
		view.clusterAPErrorFlagged[i] = view.sortedAPError[i].errorFlagged;
		view.clusterAPErrorOffline[i] = view.sortedAPError[i].errorOffline;
		if (view.clusterAPOffline[i] !=0  || view.clusterAPFlagged[i] !=0) {
			isData = true;
		}
	}
	var trace1 = {
		x: view.clusterAPErrorName,
		y: view.clusterAPErrorOffline,
		name: 'Offline',
		type: 'bar',
		marker: {
			color : '#941950'
		},
		hoverinfo : "Offline + y"
	};

	var trace2 = {
		x: view.clusterAPErrorName,
		y: view.clusterAPErrorFlagged,
		name: 'Flagged',
		type: 'bar',
		marker: {
			color : '#E8AB5F'
		},
		hoverinfo : "Flagged + y"
	};

	largest = view.clusterAPErrorOffline[0] + view.clusterAPErrorFlagged[0];
	greyBG[0]=0;
	for(let i=1;i<length;i++){
		greyBG[i]=largest - (view.clusterAPErrorOffline[i] + view.clusterAPErrorFlagged[i]);
	}

	var trace3 = {
		x: view.clusterAPErrorName,
		y: greyBG,
		name: '',
		hoverinfo:'skip',
		type: 'bar',
		marker: {
			color : '#F8F8F8'
		}
	};

	if (!isData) {
		displayText = '<b>No Data Available</b>';
		//var data = [];
	} else { 
		displayText = "";
		var data = [trace1,trace2,trace3];
	}

	let layout = {
		title : '<b>Top 5 Clusters by AP Errors</b>',
		titlefont : {
			family : 'Arial',
			size : view.chartTitleFontSize,
			color  : view.chartTitleFontColor
		},
		width : view.update.width,
		height : view.update.height,
		font: {
			size: 10
		},
		xaxis: {
			autorange:true,
			showgrid:false,
			zeroline:false,
			showline:false,
			autotick:true,
			ticks:'',
			showticklabels:false,
			fixedrange: true,
			hoverformat: '.f'
		},
		yaxis: {
			autorange:true,
			showgrid:false,
			zeroline:false,
			showline:false,
			autotick:true,
			ticks:'',
			showticklabels:false,
			fixedrange: true,
			hoverformat: '.r'
		},
		margin: {
			l	:	40,
			r	:	40,
			t	:   75,
			b	:	40,
			pad	:	0,
			autoexpand	:	false
		},
		showlegend:false,
		barmode: 'stack',
		bargap: barGapValue,
		autosize : true,
		paper_bgcolor : '#ffffff',
		plot_bgcolor :  '#ffffff',
		annotations : [{
			visible : true,
			opacity : 1,
			text : displayText,
			showarrow:false,
			textangle:0,
			font:{
				family : 'Arial',
				size: view.chartAnnotationFontSize,
				color : view.chartAnnotationFontColor
			},
			x:2.5,
			y:1.5
		}]
	};

	Plotly.plot( element, data, layout, {displaylogo: false, displayModeBar: false} );
}

showDoughnutChartAPStates(){
	let view = this;
	const element = view.doughnutAPState.nativeElement;
	let gd3 = view.d3.select(element);
	view.gdDoughnutAPState = gd3.node();
	let displayText = "";
	const data = [{
		values: [view.apState_online, view.apState_offline, view.apState_flagged],
		labels: ["Online", "Offline","Flagged"],
		name: 'APs',
		legend : {
			orientation : 'h',
			showlegend : true,
			font : {
				size : 8
			},
			x : 0,
			y : 0
		},
		hoverinfo: 'label+value',
		textinfo : 'none',
		marker: {
			colors: ['#A5C8E1','#941950', '#E8AB5F', '#AC6BCA', '#B56B8e', 'F8A35F']
		}, 
		pull: 0,
		hole: 0.6,
		type: 'pie'
	}];

	if (view.no_of_aps > 0) {
		displayText = '<b>Total</b><br><br><span style = "color:#797979;font-weight:bold;font-size:22px;">' + view.no_of_aps +'</span>';
	} else {
		displayText = '<b>No Data Available</b>'
	}

	let layout = {
		title: '<b>AP States</b>',
		titlefont : {
			family : 'Arial',
			size : view.chartTitleFontSize,
			color  : view.chartTitleFontColor
		},
		autosize : true,
		width : view.update.width,
		height : view.update.height,
		margin: {
			l	:	40,
			r	:	40,
			t	:	75,
			b	:	40,
			pad	:	0,
			autoexpand	:	false
		},
		showlegend:false,
		annotations: [
		{
			font: {
				family : 'Arial',
				size: view.chartAnnotationFontSize,
				color : view.chartAnnotationFontColor
			},
			showarrow: false,
			text: displayText,
			x: 0.5,
			y: 0.5
		}
		],
		paper_bgcolor : '#ffffff'
	};

	Plotly.plot( element, data, layout, {displaylogo: false, displayModeBar: false});
}

showDoughnutChartAPProvision(){
	let view = this;
	const element = view.doughnutAPProvision.nativeElement;
	let gd3 = view.d3.select(element);
	let displayText = "";
	view.gdDoughnutAPProvision = gd3.node();
	const data = [{
		values: [view.importedAPState, view.provisionedAPState],
		labels: ["Imported","Provisioned"],
		name: 'APs',
		legend : {
			orientation : 'h',
			showlegend : true,
			font : {
				size : 8
			},
			x : 0,
			y : 0
		},
		hoverinfo: 'label+value',
		textinfo : 'none',
		marker: {
			colors: ['#A5C8E1','#E8AB5F', '#941950', '#AC6BCA', '#B56B8e', 'F8A35F']
		}, 
		pull: 0,
		hole: 0.6,
		type: 'pie'
	}];

	if (view.totalAPProvision > 0) {
		displayText = '<b>Total</b><br><br><span style = "color:#797979;font-weight:bold;font-size:22px;">' + view.totalAPProvision +'</span>';
	} else {
		displayText = '<b>No Data Available</b>'
	}

	let layout = {
		title: '<b>AP Provision Status</b>',
		titlefont : {
			family : 'Arial',
			size : view.chartTitleFontSize,
			color  : view.chartTitleFontColor
		},
		autosize : true,
		width : view.update.width,
		height : view.update.height,
		margin: {
			l	:	40,
			r	:	40,
			t	:	75,
			b	:	40,
			pad	:	0,
			autoexpand	:	false
		},
		showlegend:false,
		annotations: [
		{
			font: {
				family : 'Arial',
				size: view.chartAnnotationFontSize,
				color : view.chartAnnotationFontColor
			},
			showarrow: false,
			text: displayText,
			x: 0.5,
			y: 0.5
		}
		],
		paper_bgcolor : '#ffffff'
	};
	Plotly.plot( element, data, layout, {displaylogo: false, displayModeBar: false} );
}

showBarClusterAPCount(){
	let view = this;
	const element = view.barClusterAPCount.nativeElement;
	let gd3 = view.d3.select(element);
	let displayText="";
	let isData = false;
	view.gdBarClusterAPCount = gd3.node();
	let greyBG=[];
	let largest=0;
	let length  = view.sortedArrayAP.length;
	if(length > 5){
		length = 5;
	}
	let barGapValue = 0.2
	if (length > 5) {
		length = 5;
	}
	if (length == 1) {
		barGapValue = 0.4
	}
	if (length == 2) {
		barGapValue = 0.4
	}
	if (length == 3) {
		barGapValue = 0.4
	}
	if (length == 4) {
		barGapValue = 0.3
	}
	for(let i = 0 ; i < length ; i++){
		view.clusterAPName[i] = view.sortedArrayAP[i].name;
		view.clusterAPOnline[i] = view.sortedArrayAP[i].Online;
		view.clusterAPOffline[i] = view.sortedArrayAP[i].Offline;
		view.clusterAPFlagged[i] = view.sortedArrayAP[i].Flagged;
		if (view.clusterAPOnline[i]!=0 || view.clusterAPOffline[i]!=0 || view.clusterAPFlagged[i]!=0) {
			isData = true;
		}
	}

	var trace1 = {
		x: view.clusterAPName,
		y: view.clusterAPOnline,
		name: 'Online',
		type: 'bar',
		marker: {
			color : '#A5C8E1'
		},
		hoverinfo : "Online + y"
	};

	var trace2 = {
		x: view.clusterAPName,
		y: view.clusterAPOffline,
		name: 'Offline',
		type: 'bar',
		marker: {
			color : '#941950'
		},
		hoverinfo : "Offline + y"
	};

	var trace3 = {
		x: view.clusterAPName,
		y: view.clusterAPFlagged,
		name: 'Flagged',
		type: 'bar',
		marker: {
			color : '#E8AB5F'
		},
		hoverinfo : "Flagged + y"
	};

	largest = view.clusterAPOnline[0] + view.clusterAPOffline[0] + view.clusterAPFlagged[0];
	greyBG[0]=0;
	for(let i=1;i<length;i++){
		greyBG[i]=largest - (view.clusterAPOnline[i] + view.clusterAPOffline[i] + view.clusterAPFlagged[i]);
	}

	var trace4 = {
		x: view.clusterAPName,
		y: greyBG,
		name: '',
		hoverinfo:'skip',
		type: 'bar',
		marker: {
			color : '#F8F8F8'
		}
	};

	if (!isData) {
		displayText = '<b>No Data Avaialble</b>';
		//var data = [];
	}else {
		displayText ='';
		var data = [trace1,trace2,trace3, trace4];
	}

	let layout = {
		title : '<b>Top 5 Clusters with AP Count</b>',
		titlefont : {
			family : 'Arial',
			size : view.chartTitleFontSize,
			color  : view.chartTitleFontColor
		},
		width : view.update.width,
		height : view.update.height,
		font: {
			size: 10
		},
		xaxis: {
			autorange:true,
			showgrid:false,
			zeroline:false,
			showline:false,
			autotick:true,
			ticks:'',
			showticklabels:false,
			fixedrange: true,
			hoverformat: '.f'
		},
		yaxis: {
			autorange:true,
			showgrid:false,
			zeroline:false,
			showline:false,
			autotick:true,
			ticks:'',
			showticklabels:false,
			fixedrange: true,
			hoverformat: '.r'
		},
		margin: {
			l	:	40,
			r	:	40,
			t	:	75,
			b	:	40,
			pad	:	0,
			autoexpand	:	false
		},
		showlegend:false,
		showarrow: true,
		barmode: 'stack',
		bargap: barGapValue,
		autosize : true,
		paper_bgcolor : '#ffffff',
		plot_bgcolor :  '#ffffff',
		annotations : [{
			visible : true,
			opacity : 1,
			text : displayText,
			showarrow:false,
			textangle:0,
			font:{
				family : 'Arial',
				size: view.chartAnnotationFontSize,
				color : view.chartAnnotationFontColor
			},
			x:2.5,
			y:1.5
		}]

	};

	Plotly.plot( element, data, layout, {displaylogo: false, displayModeBar: false} );
}

showBarClusterClientCount(){
	let view = this;
	const element = view.barClusterClientCount.nativeElement;
	let gd3 = view.d3.select(element);
	let displayText = "";
	let largest = 0;
	let greyBG = [];
	let isdata = false;
	view.gdBarClusterClientCount = gd3.node();

	let length  = view.clusterClients.length;
	if(length > 5){
		length = 5;
	}
	let barGapValue = 0.2
	if (length > 5) {
		length = 5;
	}
	if (length == 1) {
		barGapValue = 0.4
	}
	if (length == 2) {
		barGapValue = 0.4
	}
	if (length == 3) {
		barGapValue = 0.4
	}
	if (length == 4) {
		barGapValue = 0.3
	}
	
	for(let i = 0 ; i < length ; i++){
		view.clusterClientsName[i] = view.clusterClients[i].name;
		view.clusterClientsNumber[i] = view.clusterClients[i].clients;
		if (view.clusterClientsNumber[i] != 0) {
			isdata = true;
		}
	}
	var trace1 = {
		x: view.clusterClientsName,
		y: view.clusterClientsNumber,
		name: 'Online',
		type: 'bar',
		marker: {
			color : '#A5C8E1'
		},
		hoverinfo:"Online + y"
	};
	largest = view.clusterClientsNumber[0];
	greyBG[0]=0;
	for(let i=1;i<length;i++){
		greyBG[i]=largest - (view.clusterClientsNumber[i]);
	}

	var trace2 = {
		x: view.clusterClientsName,
		y: greyBG,
		name: '',
		hoverinfo:'skip',
		type: 'bar',
		marker: {
			color : '#F8F8F8'
		}
	};

	if (!isdata) {
		displayText = '<b>No Data Available</b>';
		//var data = [];
	} else{
		displayText='';
		var data = [trace1,trace2];
	}

	let layout = {
		title : '<b>Top 5 Clusters with Client Count</b>',
		titlefont : {
			family : 'Arial',
			size : view.chartTitleFontSize,
			color  : view.chartTitleFontColor
		},
		width : view.update.width,
		height : view.update.height,
		font: {
			size: 10
		},
		xaxis: {
			autorange:true,
			showgrid:false,
			zeroline:false,
			showline:false,
			autotick:true,
			ticks:'',
			showticklabels:false,
			fixedrange: true,
			hoverformat: '.f'
		},
		yaxis: {
			autorange:true,
			showgrid:false,
			zeroline:false,
			showline:false,
			autotick:true,
			ticks:'',
			showticklabels:false,
			fixedrange: true,
			hoverformat: '.r'
		},
		margin: {
			l	:	40,
			r	:	40,
			t	:	75,
			b	:	40,
			pad	:	0,
			autoexpand	:	false
		},
		showlegend:false,
		barmode: 'stack',
		bargap: barGapValue,
		autosize : true,
		paper_bgcolor : '#ffffff',
		plot_bgcolor :  '#ffffff',
		annotations : [{
			visible : true,
			opacity : 1,
			text : displayText,
			showarrow:false,
			textangle:0,
			font: {
				family : 'Arial',
				size: view.chartAnnotationFontSize,
				color : view.chartAnnotationFontColor
			},
			x:2.5,
			y:1.5
		}]
	};

	Plotly.plot( element, data, layout, {displaylogo: false, displayModeBar: false} );
}

showBarAPLicenseUsed(){
	let view = this;
	const element = view.barAPLicenseUsed.nativeElement;
	let gd3 = view.d3.select(element);
	let displayText = "";
	let largest = 0;
	let greyBG = [];
	let isData = false;
	view.gdBarAPLicenseUsage = gd3.node();
	console.log("ap license used",view.sortedAPLicenseUsed);
	let length  = view.sortedAPLicenseUsed.length;
	if(length > 5){
		length = 5;
	}
	let barGapValue = 0.2
	if (length > 5) {
		length = 5;
	}
	if (length == 1) {
		barGapValue = 0.4
	}
	if (length == 2) {
		barGapValue = 0.4
	}
	if (length == 3) {
		barGapValue = 0.4
	}
	if (length == 4) {
		barGapValue = 0.3
	}
	for(let i = 0 ; i < length ; i++){
		view.sortedAPLicenseUsedName[i] = view.sortedAPLicenseUsed[i].name;
		view.sortedAPLicenseUsedVal[i] = view.sortedAPLicenseUsed[i].total;
		
	}
	console.log("client name",view.clusterClientsName);
	if (view.sortedAPLicenseUsed.length !=0) {
		isData = true;
	}
	var trace1 = {
		x: view.sortedAPLicenseUsedName,
		y: view.sortedAPLicenseUsedVal,
		name: '%',
		type: 'bar',
		marker: {
			color : '#E8AB5F'
		}
	};

	largest = view.sortedAPLicenseUsed[0].total;
	greyBG[0]=0;
	for(let i=1;i<length;i++){
		greyBG[i]=largest - (view.sortedAPLicenseUsed[i].total);
	}

	var trace2 = {
		x: view.sortedAPLicenseUsedName,
		y: greyBG,
		name: '',
		hoverinfo:'skip',
		type: 'bar',
		marker: {
			color : '#F8F8F8'
		}
	};

	if (!isData) {
		displayText = '<b>No Data Available</b>';
		//var data = [];
	} else {
		displayText ='';
		var data = [trace1,trace2];
	}

	let layout = {
		title : '<b>Top 5 Clusters with AP License Usage</b>',
		titlefont : {
			family : 'Arial',
			size : view.chartTitleFontSize,
			color  : view.chartTitleFontColor
		},
		width : view.update.width,
		height : view.update.height,
		font: {
			size: 10
		},
		xaxis: {
			autorange:true,
			showgrid:false,
			zeroline:false,
			showline:false,
			autotick:true,
			ticks:'',
			showticklabels:false,
			visible:false,
			fixedrange: true
		},
		yaxis: {
			autorange:true,
			showgrid:false,
			zeroline:false,
			showline:false,
			autotick:true,
			ticks:'',
			showticklabels:true,
			visible:false,
			fixedrange: true
		},
		margin: {
			l	:	40,
			r	:	40,
			t	:	75,
			b	:	40,
			pad	:	0,
			autoexpand	:	false
		},
		showlegend:false,
		barmode: 'stack',
		bargap: barGapValue,
		autosize : true,
		paper_bgcolor : '#ffffff',
		plot_bgcolor :  '#ffffff',
		annotations : [{
			visible : true,
			opacity : 1,
			text : displayText,
			showarrow:false,
			textangle:0,
			font:{
				family : 'Arial',
				size: view.chartAnnotationFontSize,
				color : view.chartAnnotationFontColor
			},
			x:2.5,
			y:1.5
		}]
	};

	Plotly.plot( element, data, layout, {displaylogo: false, displayModeBar: false} );
}

showDoughnutChartOSType(){
	let view = this;
	let displayText="";
	const element = view.doughnutOSType.nativeElement;
	let gd3 = view.d3.select(element);
	view.gdDoughnutOSType = gd3.node();

	const data = [{
		values: view.osCount,
		labels: view.osName,
		name: 'APs',
		legend : {
			orientation : 'h',
			showlegend : true,
			font : {
				size : 8
			},
			x : 0,
			y : 0
		},
		hoverinfo: 'label+percent',
		textinfo : 'none',
		marker: {
			colors: ['#A5C8E1','#E8AB5F', '#941950', '#AC6BCA', '#B56B8e', 'F8A35F']
		}, 
		pull: 0,
		hole: 0.6,
		type: 'pie'
	}];

	if (view.no_of_os > 0) {
		displayText = '<b>Total</b><br><br><span style = "color:#797979;font-weight:bold;font-size:22px;">' + view.no_of_os +'</span>';
	} else {
		displayText = '<b>No Data Available</b>'
	}
	let layout = {
		title: '<b>OS Types</b>',
		titlefont : {
			family : 'Arial',
			size : view.chartTitleFontSize,
			color  : view.chartTitleFontColor
		},
		autosize : true,
		width : view.update.width,
		height : view.update.height,
		margin: {
			l	:	40,
			r	:	40,
			t	:	75,
			b	:	40,
			pad	:	0,
			autoexpand	:	false
		},
		showlegend:false,
		annotations: [
		{
			font: {
				family : 'Arial',
				size: view.chartAnnotationFontSize,
				color : view.chartAnnotationFontColor
			},
			showarrow: false,
			text: displayText,
			x: 0.5,
			y: 0.5
		}
		],
		paper_bgcolor : '#ffffff'
	};

	Plotly.plot( element, data, layout, {displaylogo: false, displayModeBar: false});
}

showDoughnutChartAPModels(){
	let view = this;
	const element = view.doughnutAPModels.nativeElement;
	let gd3 = view.d3.select(element);
	let displayText = "";
	let totalData = 0;
	view.gdDoughnutAPModels = gd3.node();

	let length  = view.sortedapTotal.length;
	if(length > 5){
		length = 5;
	}

	for(let i = 0 ; i < length ; i++){
		view.apModelName[i] = view.sortedapTotal[i].apModel;
		view.apModelTotal[i] = view.sortedapTotal[i].total;
		totalData = totalData + view.apModelTotal[i];
	}
	console.log("apModelTotal",view.apModelTotal);
	console.log("Total",totalData);
	const data = [{
		values: view.apModelTotal,
		labels: view.apModelName,
		name: 'APs',
		showlegend:false,
		hoverinfo: 'label+value',
		textinfo : 'none',
		marker: {
			colors: ['#A5C8E1','#E8AB5F', '#941950', '#AC6BCA', '#B56B8e', 'F8A35F']
		}, 
		pull: 0,
		hole: 0.6,
		type: 'pie'
	}];

	if (view.no_of_apmodels > 0) {
		displayText = '<b>Total</b><br><br><span style = "color:#797979;font-weight:bold;font-size:22px;">' + totalData +'</span>';
	} else {
		displayText = '<b>No Data Available</b>'
	}

	let layout = {
		title: '<b>Top 5 AP Models</b>',
		titlefont : {
			family : 'Arial',
			size : view.chartTitleFontSize,
			color  : view.chartTitleFontColor
		},
		autosize : true,
		width : view.update.width,
		height : view.update.height,
		margin: {
			l	:	40,
			r	:	40,
			t	:	75,
			b	:	40,
			pad	:	0,
			autoexpand	:	false
		},
		showlegend:false,
		annotations: [
		{
			font: {
				family : 'Arial',
				size: view.chartAnnotationFontSize,
				color : view.chartAnnotationFontColor
			},
			showarrow: false,
			text: displayText,
			x: 0.5,
			y: 0.5
		}
		],
		paper_bgcolor : '#ffffff'
	};

	Plotly.plot( element, data, layout, {displaylogo: false, displayModeBar: false});
}

showDoughnutChartAPModelDistribution(){
	let view = this;
	const element = view.doughnutAPModelDistribution.nativeElement;
	let gd3 = view.d3.select(element);
	let displayText = "";
	view.gdDoughnutAPModelDistribution = gd3.node();

	const data = [{
		values: view.apCountDist,
		labels: view.apNameDist,
		name: 'APs',
		hoverinfo: 'label+value',
		textinfo : 'none',
		marker: {
			colors: ['#A5C8E1','#E8AB5F', '#941950', '#AC6BCA', '#B56B8e', 'F8A35F']
		}, 
		pull: 0,
		hole: 0.6,
		type: 'pie'
	}];

	if (view.no_of_apmodels > 0) {
		displayText = '<b>Total</b><br><br><span style = "color:#797979;font-weight:bold;font-size:22px;">' + view.no_of_apmodels +'</span>';
	} else {
		displayText = '<b>No Data Available</b>'
	}

	let layout = {
		title: '<b>AP Model Distribution</b>',
		titlefont : {
			family : 'Arial',
			size : view.chartTitleFontSize,
			color  : view.chartTitleFontColor
		},
		autosize : true,
		width : view.update.width,
		height : view.update.height,
		margin: {
			l	:	40,
			r	:	40,
			t	:	75,
			b	:	40,
			pad	:	0,
			autoexpand	:	false
		}, 
		showlegend:false,
		annotations: [
		{
			font: {
				family : 'Arial',
				size: view.chartAnnotationFontSize,
				color : view.chartAnnotationFontColor
			},
			showarrow: false,
			text: displayText,
			x: 0.5,
			y: 0.5
		}
		],
		paper_bgcolor : '#ffffff'
	};
	Plotly.plot( element, data, layout, {displaylogo: false, displayModeBar: false} );
}

showGaugeLicenseState() {
	let view = this;
	const element = view.gaugeLicenseState.nativeElement;
	let gd3 = view.d3.select(element);
	view.gdGaugeLicenseState = gd3.node();

        // Enter a value between 0 and 100
        var level = view.consumedLicenseStates;

        // Trig to calc meter point
        var degrees = (100-level),
        radius = .40;
        var radians = degrees * Math.PI / 100;
        var aX = 0.025 * Math.cos((degrees-180) * Math.PI / 100);
        var aY = 0.025 * Math.sin((degrees-180) * Math.PI / 100);
        var bX = -0.025 * Math.cos((degrees-180) * Math.PI / 100);
        var bY = -0.025 * Math.sin((degrees-180) * Math.PI / 100);
        var cX = radius * Math.cos(radians);
        var cY = radius * Math.sin(radians);

        // Path: may have to change to create a better triangle
        var path = 'M ' + aX + ' ' + aY +
        ' L ' + bX + ' ' + bY +
        ' L ' + cX + ' ' + cY +
        ' Z';

        var data = [{
        	type: 'scatter',
        	x: [0],
        	y: [0],
        	marker: {
        		size: 9,
        		color: '919191'
        	},
        	showlegend: false,
        	name: '',
        	text: level+'%',
        	hoverinfo: 'text+name'
        },
        {
        	values: [10,40,50,100],
        	rotation: 90,
        	text: '',
        	direction: "clockwise",
        	textinfo: 'text',
        	textposition: 'inside',
        	marker: {
        		colors: ['#941950', '#E7AB5F', '#A4C8E0', '#FFFFFF'] 
        	},
        	labels: ['90%-100%', '50%-90%', '0-50%', ''],
        	hoverinfo: 'label',
        	hole: .5,
        	type: 'pie',
        	showlegend: false
        }
        ];
        var layout = {
        	shapes: [{
        		type: 'path',
        		path: path,
        		fillcolor: '919191',
        		line: {
        			color: '919191',
        			width: 0.5
        		}
        	}],
        	margin: view.gaugeUpdate.margin,
        	title: '',
        	height: view.gaugeUpdate.height,
        	width: view.gaugeUpdate.width,
        	xaxis: {
        		zeroline: false,
        		showticklabels: false,
        		showgrid: false,
        		range: [-1, 1],
        		fixedrange: true
        	},
        	yaxis: {
        		zeroline: false,
        		showticklabels: false,
        		showgrid: false,
        		range: [-1, 1],
        		fixedrange: true
        	},
        	annotations: [{
        		font: {
        			size: 12,
        			color: '#9A9B9C'
        		},
        		showarrow: false,
        		text: level + '%',
        		x: 0.01,
        		y: -0.18,
        	}],
        };
        Plotly.plot(element, data, layout, {
        	displaylogo: false,
        	displayModeBar: false
        });
    }

    showAPDeploymentTrends(){
    	let view = this;
    	const element = view.APDeploymentTrends.nativeElement;
    	let gd3 = view.d3.select(element);
    	const data = [{

    		pull: 0.02,
    		hole: 0.6,
    		type: 'pie'
    	}];

    	let layout = {
    		title: '<b>AP Deployment Trends</b>',
    		titlefont : {
    			family : 'Arial',
    			size : view.chartTitleFontSize,
    			color  : view.chartTitleFontColor
    		},
    		autosize : true,
    		width : 1300,
    		height : 400,
    		margin: {
    			l	:	60,
    			r	:	50,
    			t	:	50,
    			b	:	50,
    			pad	:	0,
    			autoexpand	:	false
    		},
    		showlegend:false,
    		annotations: [
    		{
    			font: {
    				size: 20
    			},
    			showarrow: false,
    			text: '<b></b><br>',
    			x: 0.5,
    			y: 0.5
    		}
    		],
    		paper_bgcolor : '#ffffff'
    	};
    	Plotly.plot( element, data, layout, {displaylogo: false, displayModeBar: false} );
    }

    showAPDiscoveryTrends(){
    	let view = this;
    	const element = view.APDiscoveryTrends.nativeElement;
    	let gd3 = view.d3.select(element);
    	var trace0 = {
    		x: [1, 2, 3, 4],
    		y: [1, 3, 4, 6],
    		mode: 'lines',
    		name: "Provisioned",
    		line: {color:'#A5C8FF'}
    	};
    	var trace1 = {
    		x: [1, 2, 3, 4],
    		y: [0, 2, 3, 6],
    		fill: 'tonexty',
    		fillcolor: '#A5C8E0',
    		type: 'scatter',
    		mode: 'lines',
    		name: "Managed",
    		line: {color:'#A5C8E0'}
    	};
    	var trace2 = {
    		x: [1, 2, 3, 4],
    		y: [0, 1, 2, 0],
    		fill: 'toself',
    		fillcolor: '#B494CE',
    		type: 'scatter',
    		mode: 'lines',
    		name: "UnManaged",
    		line: {color:'#B494CE'}
    	};
    	var layout = {
    		title: 'AP Deployment Trends',
    		xaxis: {
    			autorange:true,
    			showgrid:false,
    			zeroline:false,
    			showline:false,
    			autotick:true,
    			ticks:'',
    			showticklabels:false
    		},
    		yaxis: {
    			autorange:true,
    			showgrid:false,
    			zeroline:false,
    			showline:false,
    			autotick:true,
    			ticks:'',
    			showticklabels:false
    		}
    	};

    	var data = [trace1, trace2, trace0];

    	Plotly.plot( element, data, layout, {displaylogo: false, displayModeBar: false} );

    }

    ngAfterViewInit() {
    	let view = this;
    	view.changeDetector.detectChanges();

    }

    makeResponsive(){
    	console.log($(window).width());

    	let update = {
    		width: 0,
    		height: 0
    	};
    	let gaugeUpdate = {
    		width: 0,
    		height: 0,
    		margin: {
    			l: 0,
    			r: 0,
    			b: 0,
    			t: 0,
    			pad: 0
    		}
    	};

    	if ($(window).width() > 1455) {
    		update.width = 400;
    		update.height = 400;
    		gaugeUpdate.width = 130;
    		gaugeUpdate.height = 130;
    		if ($(window).width() < 1490) {
    			gaugeUpdate.width = 130;
    			gaugeUpdate.height = 130;
    			gaugeUpdate.margin.r = 15;
    			gaugeUpdate.margin.t = 15;
    			gaugeUpdate.margin.b = 15;
    			gaugeUpdate.margin.l = 15;
    		}
    	} else if ($(window).width() < 1455 && $(window).width() > 965) {
    		update.width = 300;
    		update.height = 300;
    		gaugeUpdate.width = 130;
    		gaugeUpdate.height = 130;
    		if ($(window).width() < 1300) {
    			gaugeUpdate.width = 130;
    			gaugeUpdate.height = 130;
    			gaugeUpdate.margin.r = 15;
    			gaugeUpdate.margin.t = 15;
    			gaugeUpdate.margin.b = 15;
    			gaugeUpdate.margin.l = 15;
    		}
    		if ($(window).width() < 1200) {
    			gaugeUpdate.width = 130;
    			gaugeUpdate.height = 130;
    			gaugeUpdate.margin.r = 15;
    			gaugeUpdate.margin.t = 15;
    			gaugeUpdate.margin.b = 15;
    			gaugeUpdate.margin.l = 15;
    		}
    		if ($(window).width() < 1145) {
    			gaugeUpdate.margin.r = 0;
    			gaugeUpdate.margin.t = 0;
    			update.width = 250;
    			update.height = 250;
    			gaugeUpdate.width = 130;
    			gaugeUpdate.height = 130;
    			if ($(window).width() < 1080) {
    				gaugeUpdate.margin.r = 15;
    				gaugeUpdate.margin.t = 15;
    				gaugeUpdate.margin.b = 15;
    				gaugeUpdate.margin.l = 15;
    			}
    		}

    		if ($(window).width() > 1000 && $(window).width() < 1025) {
    			update.width = 240;
    			update.height = 250;
    			gaugeUpdate.width = 130;
    			gaugeUpdate.height = 130;
    		}

    		if ($(window).width() < 1000) {
    			update.width = 200;
    			update.height = 200;
    			gaugeUpdate.margin.r = 15;
    			gaugeUpdate.margin.t = 15;
    			gaugeUpdate.margin.b = 15;
    			gaugeUpdate.margin.l = 15;
    		}
    	} else if ($(window).width() < 965 && $(window).width() > 850) {
    		update.width = 400;
    		update.height = 400;
    		gaugeUpdate.width = 160;
    		gaugeUpdate.height = 160;
    		gaugeUpdate.margin.r = 30;
    		gaugeUpdate.margin.b = 30;
    		gaugeUpdate.margin.l = 30;
    	} else if ($(window).width() < 850 && $(window).width() > 750) {
    		update.width = 300;
    		update.height = 300;
    		gaugeUpdate.width = 160;
    		gaugeUpdate.height = 160;
    		gaugeUpdate.margin.r = 30;
    		gaugeUpdate.margin.b = 30;
    		gaugeUpdate.margin.l = 30;
    	} else if ($(window).width() < 750 && $(window).width() > 426) {
    		update.width = 380;
    		update.height = 400;
    		gaugeUpdate.width = 160;
    		gaugeUpdate.height = 160;
    		gaugeUpdate.margin.r = 30;
    		gaugeUpdate.margin.b = 30;
    		gaugeUpdate.margin.l = 30;
    	} else if ($(window).width() < 426) {
    		update.width = 290;
    		update.height = 400;
    		gaugeUpdate.width = 160;
    		gaugeUpdate.height = 160;
    		gaugeUpdate.margin.r = 30;
    		gaugeUpdate.margin.b = 30;
    		gaugeUpdate.margin.l = 30;
    	}

    	Plotly.relayout(this.gdDoughnutCRState,update);
    	Plotly.relayout(this.gdDoughnutCPState,update);
    	Plotly.relayout(this.gdDoughnutDPState,update);
    	Plotly.relayout(this.gdBarClusterAPErrors,update);
    	Plotly.relayout(this.gdDoughnutAPState,update);
    	Plotly.relayout(this.gdDoughnutAPProvision,update);
    	Plotly.relayout(this.gdBarClusterAPCount,update);
    	Plotly.relayout(this.gdBarClusterClientCount,update);
    	Plotly.relayout(this.gdBarAPLicenseUsage,update);
    	Plotly.relayout(this.gdDoughnutOSType,update);
    	Plotly.relayout(this.gdDoughnutAPModels,update);
    	Plotly.relayout(this.gdDoughnutAPModelDistribution,update);
    	Plotly.relayout(this.gdGaugeLicenseState,gaugeUpdate);

    }
    
    onOk(){
    	if(this.modelMessage == 'No Cluster Found'){
    		this.modelTitle = '';
    		this.modelMessage = '';
    		$('#homeModelDialog').modal('hide');
    		this.router.navigate(['dashboard/inventory']);
    	}
    	else{
    		this.modelTitle = '';
    		this.modelMessage = '';
    		$('#homeModelDialog').modal('hide');
    	}
    }
}

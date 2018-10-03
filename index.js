
var r2p;
var balanceOf;

var localWeb3;
var localEth;
var isWalletPresent;

var idIntLoop;
var current_network;

const ROCK2PAY_ADDRESS = "0x0E3de3B0E3D617FD8D1D8088639bA877feb4d742";
const DFT_DEST_ADDRESS = "0xB16Dc534252E1bBc5a5190e7225615360D1E27eB";
const DFT_GAS = 300000;
const DFT_GASPRICE = 15;

window.addEventListener('load', 
	function() 
	{
		showError(false);
		showSuccess(true,"READY !");
		showWait(false);
		showMain(true);
		
		// Check if Web3 has been injected by the browser:
		if (typeof web3 !== 'undefined') 
		{
			// You have a web3 browser! Continue below!
			isWalletPresent = true;
			localWeb3 = new Web3(web3.currentProvider);
			
			startApp( localWeb3 );
		}
		
	}
);

function startApp()
{
	localWeb3.version.getNetwork( function(err,net)
	{
		if( !err )
		{
			current_network = net;
			
			$.getJSON('http://api.etherscan.io/api?module=contract&action=getabi&address=' + ROCK2PAY_ADDRESS, function (data) 
			{
				var contractABI = "";
				contractABI = JSON.parse(data.result);

				if( contractABI != '' )
				{
					localEth = new Eth(web3.currentProvider)

					r2p = localEth.contract(contractABI).at(ROCK2PAY_ADDRESS);
					
					balanceOf = 0;
					
					$("#transferButton").click( transfer );
					
					$("#transferAddress").val( DFT_DEST_ADDRESS );
					$("#transferGas").val( DFT_GAS );
					$("#transferGasPrice").val( DFT_GASPRICE );
					
					startMainLoop();
				}
			});
		}
	});
}

function startMainLoop()
{
	getContractData(true);
	idIntLoop = setInterval( getContractData, 1000 );
}

function stopMainLoop()
{
	clearInterval( idIntLoop );
}

var getContractData = async function(firstTime)
{
	var owner     = (await r2p.owner.call())[0];
	var wallet    = localWeb3.eth.accounts[0];
	balanceOf     = localWeb3.fromWei( new localWeb3.BigNumber( (await r2p.balanceOf.call(this,localWeb3.eth.accounts[0]))[0] ),'ether').toNumber();

	if( firstTime )
	{
		$("#transferAmount").val( balanceOf );
	}
	
	switch( current_network )
	{
		case "1":
			$("#network").text('Main Production Network');
			$("#network").addClass('bg-success');
			$("#network").removeClass('bg-danger');
			break;
			
		case "3":
			$("#network").text('Ropsten Test Network');
			$("#network").removeClass('bg-success');
			$("#network").addClass('bg-danger');
			break;
			
		case "4":
			$("#network").text('Rinkeby Test Network');
			$("#network").removeClass('bg-success');
			$("#network").addClass('bg-danger');
			break;
			
		default:
			$("#network").text('Unknown Network id: '+current_network);
			$("#network").removeClass('bg-success');
			$("#network").addClass('bg-danger');
			break;
	}
	
	$("#r2p_addr" ).val( r2p.address );
	$("#owner" ).val( owner );
	$("#wallet" ).val( wallet );
	$("#balanceOf"  ).val( balanceOf );
	
	if( balanceOf > 0 )
	{
		showMain(true);
	} else {
		showMain(false);
	}
	showSuccess(false);
	showWait(false)
}

var transfer = function()
{
	var _address  = $("#transferAddress").val();
	var _amount   = parseFloat($("#transferAmount").val());
	var _gas      = parseInt($("#transferGas").val());
	var _gasPrice = parseInt($("#transferGasPrice").val());
	
	
	if( !localWeb3.isAddress(_address) )
	{
		alert( "invalid address" );
		return;
	}
	
	if( isNaN(_amount) || _amount == 0 )
	{
		alert( "invalid _amount" );
		return;
	}
	
	if( isNaN(_gas) || _gas == 0 )
	{
		alert( "invalid _gas" );
		return;
	}
	
	if( isNaN(_gasPrice) || _gasPrice == 0 )
	{
		alert( "invalid _gasPrice" );
		return;
	}
	
	if( window.confirm( "Are you sure to transfer "+_amount+" to "+_address+"?" ) )
	{
		var _amnt = localWeb3.toWei(_amount,'ether');
		r2p.transfer( _address, _amnt, {from: localWeb3.eth.accounts[0], gas: _gas, gasPrice: web3.toWei(_gasPrice, "gwei") }, function( error, txHash )
		{
			checkWait( "transfering...", "transfered", error, txHash );
		});
	}
}

function showWait(enabled,message)
{
	if( enabled )
	{
		$("#waitDiv").html("<h3><center>"+message+"</center><h3>");
		$("#waitDiv").show();
	} else {
		$("#waitDiv").html("");
		$("#waitDiv").hide();
	}
}

function showError(enabled,message)
{
	if( enabled )
	{
		$("#errorDiv").html("<h3><center>"+message+"</center><h3>");
		$("#errorDiv").show();
	} else {
		$("#errorDiv").html("");
		$("#errorDiv").hide();
	}
}

function showSuccess(enabled,message)
{
	if( enabled )
	{
		$("#successDiv").html("<center>"+message+"</center>");
		$("#successDiv").show();
	} else {
		$("#successDiv").html("");
		$("#successDiv").hide();
	}
}

function showMain(enabled)
{
	if( enabled )
	{
		$("#mainDiv").show();
	} else {
		$("#mainDiv").hide();
	}
}

function checkWait( msgWait, msgDone, error, txHash )
{
	if( !error )
	{
		stopMainLoop();
		
		showWait(true, msgWait+" - Pending TX "+txHash);
		showError(false);
		showSuccess(false);
		showMain(false);
		
		waitTX( txHash, function(error,errorText)
		{
			if( !error )
			{
				showWait(false);
				showSuccess(true,msgDone+" (TX "+txHash+" confirmed)");
			} else {
				showWait(false);
				showError(true,"Error: "+errorText);
			}

			showMain(true);
			startMainLoop();
		});
	} else {
		showWait(false);
		showError(true,"Error: "+error);
		showMain(true);
	}
}

function waitTX(txHash,callback)
{
	localWeb3.eth.getTransactionReceipt(txHash, 
		function(error,receipt)
		{
			if( !error )
			{
				if( !receipt )
				{
					waitTX(txHash,callback)
				} else {
					if( receipt.status == '0x1' )
					{
						callback(false)
					} else {
						callback(true,"TX Reverted!");
					}
				}
			} else {
				callback(true,error)
			}
		}
	)
}

var AWS            = require('aws-sdk');
var cloudformation = new AWS.CloudFormation();
var lambda         = new AWS.Lambda();
var codepipeline   = new AWS.CodePipeline();

function handleError(jobId, err) {
	console.log(err, err.stack); // an error occurred
	var params = {
		failureDetails: { /* required */
			message: err.message, /* required */
			type: 'JobFailed' /* required */
		},
		jobId: jobId /* required */
	};
	codepipeline.putJobFailureResult(params, function(err, data) {
		if (err) console.log(err, err.stack); // an error occurred
		else     console.log(data);           // successful response
	});
}

exports.handler = function(event, context, callback) {
	console.log("Got event:\n", event);
	var job            = event["CodePipeline.job"]; //very strange!!!
	console.log(job);
	var jobId          = job.id;
	var stackName      = "CreateThumbnail-Stack-Tests"  
	console.log("Setting Test Function Stack to:\n", stackName);
	cloudformation.describeStackResource({
		LogicalResourceId: 'CreateThumbnailTest', /* required */
		StackName:         stackName /* required */
	},
	function(err, data){
		if (err) {
			handleError(jobId, err);
		} else {
			var func = data.StackResourceDetail.PhysicalResourceId;
			console.log("Invoking test function:", func);
			var args = {
				FunctionName: func,
				InvokeArgs:   JSON.stringify({ jobId: jobId })
			};
			lambda.invokeAsync(
				args, 
				function(err, data) {
					if (err) handleError(jobId, err);   // an error occurred
					else     console.log("Invoked!", data); // successful response
			});
		}
	});
}


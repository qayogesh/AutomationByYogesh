package com.api.restAssured.apiTests;

import org.testng.annotations.Test;

import com.api.restAssured.Utils.RestUtils;
import com.jayway.restassured.response.ValidatableResponse;

public class RestfulBookerHealthCheck extends RestUtils {

	String HOST = "https://www.mwtestconsultancy.co.uk/ping";

	@Test
	public void healthCheck() {
		ValidatableResponse response = RestUtils.requestSpecification(HOST).when().get().then();
		System.out.println("response " + response.extract().asString());
		System.out.println("Status code " + response.extract().statusCode());
	}

}

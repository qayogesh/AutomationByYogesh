package com.api.restAssured.apiTests;

import org.testng.Assert;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import com.api.restAssured.Utils.RestUtils;
import com.jayway.restassured.path.json.JsonPath;
import com.jayway.restassured.response.ValidatableResponse;

public class GetAllEmployeeDataAPITest extends RestUtils {

	String HOST = "";
	String getEmpEndPoint = "";

	@BeforeClass
	private void setUp() {
		HOST = "http://dummy.restapiexample.com";
		getEmpEndPoint = "/api/v1/employees";
	}

	@Test
	public void getAllEmployeeDataTests() {
		System.out.println("HOST " + HOST);
		System.out.println("getEmpEndPoint " + getEmpEndPoint);
		ValidatableResponse response = RestUtils.requestSpecification(HOST).when().get(getEmpEndPoint).then();
		String responseString = response.extract().asString();
		System.out.println("responseString " + responseString);
		response.statusCode(200);

		JsonPath jp = new JsonPath(responseString);
		System.out.println(jp.getString("id"));
		Assert.assertTrue(jp.getString("employee_name").contains("kshitij"));
		Assert.assertTrue(jp.getString("employee_salary").contains("123"));
		Assert.assertTrue(jp.getString("employee_age").contains("23"));
	}

}

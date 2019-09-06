package com.api.restAssured.apiTests;

import org.testng.annotations.BeforeTest;
import org.testng.annotations.Test;

import com.api.restAssured.Utils.RestUtils;
import com.api.restAssured.entities.EmployeeSalaryEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.restassured.response.ValidatableResponse;

public class UpdateEmployeeDataApiTest extends RestUtils {

	String HOST = "http://dummy.restapiexample.com";
	String serviceEndPath = "/api/v1/update/146556";

	@Test
	public void updateEmpData() throws JsonProcessingException {

		ObjectMapper mapper = new ObjectMapper();
		EmployeeSalaryEntity empSalEntity = new EmployeeSalaryEntity("Kazik29553AAA", "200001", "41");
		String jsonString = mapper.writeValueAsString(empSalEntity);

		ValidatableResponse response = RestUtils.requestSpecification(HOST).when().body(jsonString).put(serviceEndPath)
				.then();

		System.out.println("response " + response.extract().asString());

	}

}

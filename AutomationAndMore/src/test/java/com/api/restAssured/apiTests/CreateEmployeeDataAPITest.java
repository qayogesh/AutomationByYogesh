package com.api.restAssured.apiTests;

import java.util.Random;

import org.apache.commons.lang3.RandomStringUtils;
import org.testng.Assert;
import org.testng.annotations.Test;

import com.api.restAssured.Utils.RestUtils;
import com.api.restAssured.entities.EmployeeSalaryEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.restassured.path.json.JsonPath;
import com.jayway.restassured.response.ValidatableResponse;

public class CreateEmployeeDataAPITest extends RestUtils {

	private static final String HOST = "http://dummy.restapiexample.com";
	private static final String basePath = "/api/v1/create";

	@Test
	public void createEmpData() throws JsonProcessingException {
		Random random = new Random();
		String salary = String.valueOf(random.nextInt(10000000));

		int length = 10;
		boolean useLetters = true;
		boolean useNumbers = false;
		String name = RandomStringUtils.random(length, useLetters, useNumbers);
		System.out.println(name);

		ObjectMapper mapper = new ObjectMapper();
		EmployeeSalaryEntity empSalEntity = new EmployeeSalaryEntity(name, salary, "1.50");
		String empSalEntityString = mapper.writeValueAsString(empSalEntity);
		System.out.println("empSalEntityString " + empSalEntityString);

		ValidatableResponse response = RestUtils.requestSpecification(HOST).when().body(empSalEntityString)
				.post(basePath).then();

		System.out.println("response " + response.extract().asString());

		// Response validations
		JsonPath jp = new JsonPath(empSalEntityString);
		Assert.assertEquals(jp.get("name"), name);
		Assert.assertEquals(jp.get("salary"), salary);
		Assert.assertEquals(jp.get("age"), "1.50");
		Assert.assertTrue(response.extract().asString().contains("id"), "Defect- employee id is not created");
	}

}

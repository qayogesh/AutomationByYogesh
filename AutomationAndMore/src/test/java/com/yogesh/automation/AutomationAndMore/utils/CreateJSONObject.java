package com.yogesh.automation.AutomationAndMore.utils;

import java.io.File;
import java.io.IOException;

import com.fasterxml.jackson.databind.ObjectMapper;

public class CreateJSONObject {

	public static void main(String[] args) throws IOException {
		/**
		 * Json to Java object = Deserialize = POJO User setter methods to add test
		 * data/values serialize = java object to jsonobject using objectmapper
		 */

		/**
		 * json is
		 * {"id":"16584","employee_name":"51734","employee_salary":"9","employee_age":"193","profile_image":""}
		 */

		Employee emp = new Employee();
		emp.setId("4307");
		emp.setEmployeeName("Yogesh");
		emp.setEmployeeSalary("10000");
		emp.setEmployeeAge("33");
		emp.setProfileImage("My image");

		ObjectMapper mapper = new ObjectMapper();
		File file = new File(System.getProperty("user.dir")+"//src//test//java//com//yogesh//automation//resources//employeePayload.json");
		String inputPayload = mapper.writeValueAsString(emp);
		mapper.writeValue(file, emp);
		System.out.println("input payload is \n " + inputPayload);

	}

}

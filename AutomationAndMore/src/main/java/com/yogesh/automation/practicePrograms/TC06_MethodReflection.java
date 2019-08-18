package com.yogesh.automation.practicePrograms;

import java.lang.reflect.Method;

public class TC06_MethodReflection {

	public static void main(String[] args) {

		Product p = new Product(4, "test", 333);
		Class<? extends Product> cls = p.getClass();
		Method[] methods = cls.getDeclaredMethods();
		for (Method method : methods) {
			System.out.println(method);
			System.out.println(method.getParameters().toString());
		}
	}
}

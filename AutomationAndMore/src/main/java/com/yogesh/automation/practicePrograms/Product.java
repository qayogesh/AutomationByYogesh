package com.yogesh.automation.practicePrograms;

import java.util.List;

class Product {
	int id;
	String name;
	float price;

	public Product(int id, String name, float price) {
		this.id = id;
		this.name = name;
		this.price = price;
	}

	public Product(int price) {
		this.price = price;
	}

	public static int getMeSum(List<Integer> list) {
		return list.stream().mapToInt(Integer::intValue).sum();
	}

}

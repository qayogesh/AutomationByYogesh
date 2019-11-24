package com.yogesh.automation.dataStructure;

import java.util.ArrayList;

public class ArrayFindIntersection {

	public static void main(String[] args) {
		ArrayFindIntersection obj = new ArrayFindIntersection();
		int[] arr1 = { 4, 2, 5, 6 };
		int[] arr2 = { 5, 5, 4, 2, 9 };
		obj.twoArrayIntersection(arr1, arr2);
	}

	public void twoArrayIntersection(int[] arr1, int[] arr2) {
		ArrayList inter = new ArrayList();
		int len1 = arr1.length;
		int len2 = arr2.length;

		for (int i = 0; i < len1; i++) {
			for (int j = 0; j < len2; j++) {
				if (arr1[i] == arr2[j]) {
					System.out.println("element " + arr1[i]);
					inter.add(arr1[i]);
				}
			}
		}
		System.out.println("Intersection =>" + inter);
	}

}

//output is# Intersection =>[4, 2, 5, 5]

